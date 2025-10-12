<script lang="ts">
  import { fly } from "svelte/transition";
  import { createEventDispatcher, onDestroy } from "svelte";
  import StreamBoard from "./StreamBoard.svelte";
  import ResultsChart from "./ResultsChart.svelte";
  import type { Domain, TargetFeature, FullResult, Stimulus, ClickEvent } from "./types";
  import { generateSequence } from "./logic/generator";

  const dispatch = createEventDispatcher<{ done: FullResult }>();

  let domain: Domain = 'figures';
  let nBack: 1|2|3 = 1;
  let target: TargetFeature = 'shape';
  const DURATION_MS = 60_000;

  let phase: 'config'|'countdown'|'running'|'done' = 'config';
  let countdown = 3;
  let seq: Stimulus[] = [];
  let idx = 0;
  let current: Stimulus | null = null;
  let clicks: ClickEvent[] = [];
  let lastClickTs: number | null = null;
  let startAt = 0;
  let stimShownAt = 0;
  let remainSec = 60;
  let tickTimer: any = null;

  function pickTargetForFigures(): TargetFeature {
    return Math.random() < 0.5 ? 'shape' : 'color';
  }

  function start() {
    const actualTarget: TargetFeature = domain === 'numbers' ? 'number' : pickTargetForFigures();
    target = actualTarget;
    seq = generateSequence({ domain, nBack, target: actualTarget, totalCount: 100, matchRatio: 0.3 });
    phase = 'countdown';
    countdown = 3;
    const t = setInterval(() => {
      countdown -= 1;
      if (countdown <= 0) {
        clearInterval(t);
        run();
      }
    }, 1000);
  }

  function run() {
    phase = 'running';
    startAt = Date.now();
    idx = 0;
    current = seq[idx];
    stimShownAt = Date.now();
    remainSec = 60;
    tickTimer = setInterval(() => {
      const left = Math.max(0, DURATION_MS - (Date.now() - startAt));
      remainSec = Math.ceil(left / 1000);
      if (left <= 0) finish();
    }, 200);
  }

  function advance() {
    idx += 1;
    if (idx >= seq.length) { finish(); return; }
    current = seq[idx];
    stimShownAt = Date.now();
  }

  function onAnswer(ans: 'yes'|'no') {
    if (phase !== 'running' || !current) return;
    if (current.truth === null) { advance(); return; }

    const has = clicks.length && clicks[clicks.length-1].stimIndex === current.idx;
    if (has) return;

    const now = Date.now();
    const truth = current.truth!;
    const isYes = ans === 'yes';
    const isCorrect = (isYes && truth) || (!isYes && !truth);
    const rtMs = now - stimShownAt;
    const interClickMs = lastClickTs == null ? (now - startAt) : (now - lastClickTs);

    const ce: ClickEvent = {
      ts: now,
      stimIndex: current.idx,
      domain,
      nBack,
      target: domain === 'numbers' ? 'number' : target,
      answer: ans,
      truth,
      isCorrect,
      rtMs,
      interClickMs
    };
    clicks = [...clicks, ce];
    lastClickTs = now;

    advance();
  }

  function finish() {
    if (phase === 'done') return;
    clearInterval(tickTimer);
    phase = 'done';
    const totalStimuli = seq.length;
    const correct = clicks.filter(c => c.isCorrect).length;
    const incorrect = clicks.length - correct;
    const avgRt = clicks.length ? Math.round(clicks.reduce((a,c)=>a+c.rtMs,0)/clicks.length) : null;
    const res: FullResult = {
      domain,
      nBack,
      target: domain === 'numbers' ? 'number' : target,
      durationMs: Math.min(DURATION_MS, Date.now() - startAt),
      clicks,
      totalStimuli,
      summary: {
        correct, incorrect,
        accuracy: clicks.length ? +(correct / clicks.length).toFixed(3) : 0,
        avgRtMs: avgRt,
        misses: 0
      }
    };
    dispatch('done', res);
  }

  function restart() {
    clicks = [];
    lastClickTs = null;
    seq = [];
    phase = 'config';
    clearInterval(tickTimer);
  }

  onDestroy(()=> clearInterval(tickTimer));
</script>

{#if phase === 'config'}
  <div class="p-6 space-y-6">
    <h2 class="text-xl font-semibold">Выберите режим</h2>
<hr>
    <div class="grid grid-cols-2 gap-4 max-w-xl">
      <button class="card" class:selected={domain==='figures'} on:click={()=> domain='figures'}>
        <div class="text-3xl mb-2">⬢</div>
        <div class="font-medium">Фигуры</div>
      </button>
      <button class="card" class:selected={domain==='numbers'} on:click={()=> domain='numbers'}>
        <div class="text-3xl mb-2">7</div>
        <div class="font-medium">Числа</div>
      </button>
    </div>

    <div class="grid grid-cols-3 gap-4 max-w-xl">
      <button class="card" class:selected={nBack===1} on:click={()=> nBack=1}><div class="text-2xl">1-back</div></button>
      <button class="card" class:selected={nBack===2} on:click={()=> nBack=2}><div class="text-2xl">2-back</div></button>
      <button class="card" class:selected={nBack===3} on:click={()=> nBack=3}><div class="text-2xl">3-back</div></button>
    </div>

    <div class="w-full flex justify-center gap-4 pt-2"><button class="btn" on:click={start}>Далее</button></div>
  </div>
{:else if phase === 'countdown'}
  <div class="grid place-items-center p-10 text-center">
    <div class="text-lg mb-2 opacity-80">Задание</div>
    <div class="text-2xl font-semibold mb-6">
      {#if domain === 'figures'}
        Сравнение по {target === 'shape' ? 'форме' : 'цвету'}
      {:else}
        Сравнивайте числовые значения
      {/if}
    </div>
    <div class="text-6xl font-bold">{countdown}</div>
  </div>
{:else if phase === 'running'}
  <div class="p-6 space-y-6">
    <div class="text-lg font-semibold text-center">
      {#if domain === 'figures'}
        {target === 'shape' ? 'Форма такая' : 'Цвет такой'} же, как {nBack}-ход(а) назад?
      {:else}
        Число такое же, как {nBack}-ход(а) назад?
      {/if}
    </div>
    <div class="text-sm opacity-70 text-center -mt-1">Осталось ~ {remainSec} c</div>

    {#if current && current.truth === null}
      <div class="hint">
        Запомните {nBack === 1 ? 'первую' : nBack === 2 ? 'первые две' : 'первые три'} {domain === 'figures' ? 'фигур' : 'числа'} — ответы пока не принимаются.
      </div>
    {/if}

    <StreamBoard {current} />

    <div class="flex gap-4 justify-center pt-2">
      {#if current?.truth === null}
        <button class="btn primary" on:click={advance} aria-label="Далее (Space)">Далее</button>
      {:else}
        <button class="ans yes" on:click={() => onAnswer('yes')}>Да</button>
        <button class="ans no"  on:click={() => onAnswer('no')}>Нет</button>
      {/if}
    </div>
  </div>
{:else}
  <div class="p-6 space-y-4">
    <h2 class="text-xl font-semibold">Результаты</h2>
    <ResultsChart {clicks} />

    <div class="flex gap-4 justify-center pt-2">
      <div class="stat"><div class="label">Ответов</div>
        <div class="value">{clicks.length}</div></div>
      <div class="stat"><div class="label">Средний RT</div>
        <div class="value">{(clicks.length ? Math.round(clicks.reduce((a,c)=>a+c.rtMs,0)/clicks.length) : 0)} мс</div></div>
      <div class="stat"><div class="label">% верных</div>
        <div class="value">{(clicks.length ? Math.round(100*clicks.filter(c=>c.isCorrect).length/clicks.length) : 0)}%</div></div>
    </div>
  </div>
{/if}

<svelte:window on:keydown={(e) => {
  if (phase !== 'running') return;
  if (current?.truth === null) { if (e.code === 'Space') { e.preventDefault(); advance(); } return; }
  if (e.key === 'j' || e.key === 'J') onAnswer('yes');
  if (e.key === 'f' || e.key === 'F') onAnswer('no');
}} />


<style>
  /* Карточки выбора */
  .card {
    padding:1rem; border:1px solid rgba(0,0,0,.18);
    border-radius:1rem; background:#fff; color:#111827;
    display:grid; place-items:center; cursor:pointer;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    transition: box-shadow .15s, transform .15s;
  }
  .card:hover { box-shadow: 0 2px 8px rgba(0,0,0,.10); transform: translateY(-1px); }
  .card.selected { outline:2px solid #3B82F6; box-shadow: 0 0 0 4px rgba(59,130,246,.15); }

  /* Основные кнопки ответа — контрастные */
  .ans { padding: .9rem 1.5rem; border-radius: 12px; border: 0; font-size: 1.05rem; font-weight:600; cursor: pointer; color:#fff; }
  .yes { background: #16a34a; } .yes:hover { background:#15803d; }
  .no  { background: #dc2626; } .no:hover  { background:#b91c1c; }

  /* Универсальная кнопка (например, “Далее”) */
  .btn { padding:.7rem 1.1rem; border-radius:.8rem; border:1px solid rgba(0,0,0,.2); background:#fff; color:#111827; cursor:pointer; font-weight:600; }
  .btn:hover { background:#f8fafc; }
  .btn.primary { border-color:#3B82F6; }

  /* Инфо-баннер */
  .hint {
    border-radius: 12px; background:#fff7ed; border:1px solid #fed7aa;
    color:#9a3412; padding:.6rem .9rem; text-align:center; font-size:.95rem;
  }
  .stat { padding: .8rem 1rem; border:1px solid rgba(0,0,0,.1); border-radius:.8rem; background:#fff; }
  .label { font-size:.8rem; opacity:.7; }
  .value { font-size:1.3rem; font-weight:600; }
</style>
