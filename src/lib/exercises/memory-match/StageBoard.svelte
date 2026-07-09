<script lang="ts">
  import { createEventDispatcher, onMount, onDestroy } from "svelte";
  import type { CardModel, StageResult, PairMetric } from "./types";

  // входные пропсы
  export let rows: number;
  export let cols: number;
  export let cards: CardModel[];     // перемешанная раскладка
  export let overlayUrl: string;     // картинка «рубашки»
  export let stage: number;
  export let stageStartedAt: number; // приходит от родителя (момент старта этапа)

  // Управление размером карточек:
  // - cardSizePxOverride: фиксированный размер (если задан — игнорируем авто-расчёт)
  // - minCardPx/maxCardPx: рамки для авто-подбора
  // - gapPx: расстояние между карточками
  export let cardSizePxOverride: number | null = null;
  export let minCardPx = 56;
  export let maxCardPx = 160;
  export let gapPx = 8;

  const dispatch = createEventDispatcher<{ finished: StageResult }>();

  // Локальный иммутабельный стейт
  let board: CardModel[] = [];
  $: board = cards;

  // Счётчики
  let flips = 0;        // каждое открытие карты
  let mistakes = 0;     // промахи (когда вторая карта не совпала)
  let turnCount = 0;    // число «ходов» (каждый раз, когда открыли вторую карту)
  let firstOpenId: string | null = null;
  let lock = false;

  // Парные метрики
  type SeenState = { a?: number; b?: number };
  const seenByPair: Record<string, SeenState> = {};
  const pairMetrics: PairMetric[] = [];

  onMount(() => {
    flips = 0; mistakes = 0; turnCount = 0; firstOpenId = null; lock = false;
    Object.keys(seenByPair).forEach(k => delete seenByPair[k]);
    pairMetrics.length = 0;
  });
  onDestroy(() => {/* no timers to clear now */});

  // Иммутабельные апдейты
  function updateCard(id: string, patch: Partial<CardModel>) {
    board = board.map((c) => (c.id === id ? { ...c, ...patch } : c));
  }
  function allMatched(b = board) { return b.every((c) => c.isMatched); }

  // Учёт "видимости" половинок пары по ходам
  function markSeen(key: string) {
    const st = seenByPair[key] ?? {};
    if (st.a === undefined) st.a = turnCount; else if (st.b === undefined) st.b = turnCount;
    seenByPair[key] = st;
  }
  function registerMatchMetric(key: string) {
    const st = seenByPair[key] ?? {};
    const a = st.a ?? turnCount;
    const b = st.b ?? turnCount;
    const infoKnownAtTurn = Math.max(a, b);
    const matchedAtTurn = turnCount;
    const pairEfficiency = matchedAtTurn - infoKnownAtTurn;
    const excludedAsInstant = pairEfficiency === 0;
    pairMetrics.push({ key, infoKnownAtTurn, matchedAtTurn, pairEfficiency, excludedAsInstant });
  }

  // Авто-подбор размера карточек из размеров КОНТЕЙНЕРА (не всего окна!)
  let containerEl: HTMLDivElement;
  let cardSizePx = 100;

  function recalcCardSizeFromContainer() {
    if (cardSizePxOverride) {
      cardSizePx = cardSizePxOverride;
      containerEl?.style.setProperty("--card-size", `${cardSizePx}px`);
      containerEl?.style.setProperty("--gap", `${gapPx}px`);
      return;
    }
    if (!containerEl) return;
    const rect = containerEl.getBoundingClientRect();
    // Оставим чуть места сверху/снизу для заголовков родителя
    const padW = 16 * 2;
    const padH = 16 * 2 + 24; // + строка/отступ сверху
    const availW = Math.max(0, rect.width  - padW - gapPx * (cols - 1));
    const availH = Math.max(0, rect.height - padH - gapPx * (rows - 1));

    const sizeW = Math.floor(availW / cols);
    const sizeH = Math.floor(availH / rows);

    cardSizePx = Math.min(
      Math.max(minCardPx, Math.min(sizeW, sizeH)),
      maxCardPx
    );

    containerEl.style.setProperty("--card-size", `${cardSizePx}px`);
    containerEl.style.setProperty("--gap", `${gapPx}px`);
  }

  let ro: ResizeObserver | null = null;
  onMount(() => {
    recalcCardSizeFromContainer();
    ro = new ResizeObserver(recalcCardSizeFromContainer);
    if (containerEl) ro.observe(containerEl);
    const onResize = () => recalcCardSizeFromContainer();
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      ro?.disconnect();
    };
  });

  function onCardClick(c: CardModel) {
    if (lock || c.isMatched || c.isOpen) return;

    // Открываем первую карту в ходе
    flips += 1;
    updateCard(c.id, { isOpen: true });
    markSeen(c.key);

    if (!firstOpenId) {
      firstOpenId = c.id;
      return;
    }

    // Это вторая карта — завершаем ход
    turnCount += 1;

    const prevId = firstOpenId;
    firstOpenId = null;
    const prev = board.find((x) => x.id === prevId);
    if (!prev) return;

    if (prev.key === c.key) {
      // Совпало
      updateCard(prev.id, { isMatched: true });
      updateCard(c.id, { isMatched: true });
      registerMatchMetric(c.key);

      if (allMatched()) {
        const endedAt = Date.now();
        const durationMs = endedAt - stageStartedAt;

        const eligible = pairMetrics.filter(p => !p.excludedAsInstant);
        const avgPairEfficiency =
          eligible.length > 0 ? +(eligible.reduce((s, p) => s + p.pairEfficiency, 0) / eligible.length).toFixed(3) : null;

        const res: StageResult = {
          stage, rows, cols,
          cardsCount: rows * cols,
          pairsCount: (rows * cols) / 2,
          flipsCount: flips,
          mistakes,
          startedAt: stageStartedAt,
          endedAt,
          durationMs,
          efficiency: flips / (rows * cols),
          turnCount,
          pairMetrics: [...pairMetrics],
          avgPairEfficiency
        };
        dispatch("finished", res);
      }
    } else {
      // Не совпало
      mistakes += 1;
      lock = true;
      setTimeout(() => {
        updateCard(prev.id, { isOpen: false });
        updateCard(c.id, { isOpen: false });
        lock = false;
      }, 600);
    }
  }
</script>

<!-- убрали локальный таймер этапа; общий показывается в MemoryMatchGame -->
<div class="w-full h-full flex flex-col p-4" bind:this={containerEl}>
  <div
    class="grid mx-auto"
    style={`grid-template-columns: repeat(${cols}, var(--card-size));
            grid-auto-rows: var(--card-size);
            gap: var(--gap);
            justify-content: center;`}
  >
    {#each board as c (c.id)}
      <button
        class="relative rounded-xl shadow overflow-hidden border border-white/10 focus:outline-none focus:ring-2 focus:ring-white/30 disabled:opacity-60"
        on:click={() => onCardClick(c)}
        disabled={c.isMatched}
        aria-pressed={c.isOpen}
        aria-label="card"
        style="width: var(--card-size); height: var(--card-size);"
      >
        {#if c.isOpen || c.isMatched}
          <img src={c.imgUrl} alt="" class="w-full h-full object-contain p-1 select-none" draggable="false" />
        {:else}
          <img src={overlayUrl} alt="" class="w-full h-full object-contain p-1 select-none" draggable="false" />
        {/if}
      </button>
    {/each}
  </div>
</div>
