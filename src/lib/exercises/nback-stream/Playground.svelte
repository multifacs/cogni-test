<script lang="ts">
  import NBackStreamGame, { type FullResult } from "./NBackStreamGame.svelte";
  import ResultsChart from "./ResultsChart.svelte";

  let running = true;
  let final: FullResult | null = null;

  function handleDone(e: CustomEvent<FullResult>) {
    final = e.detail;
    running = false;
  }

  function restart() {
    running = true;
    final = null;
  }

  // агрегаты для карточек
  $: total = final?.clicks.length ?? 0;
  $: correct = final ? final.clicks.filter(c => c.isCorrect).length : 0;
  $: accuracyPct = total ? Math.round(100 * correct / total) : 0;
  $: avgRt = total ? Math.round(final!.clicks.reduce((a,c)=>a+c.rtMs,0) / total) : 0;
</script>

{#if running}
  <NBackStreamGame on:done={handleDone} />
{:else}
  <div class="p-6 space-y-6">
    <div class="text-xl font-semibold">Результаты</div>

    <!-- График: X — ответы, Y — время реакции (мс), пунктир — среднее -->
    <ResultsChart clicks={final?.clicks ?? []} />

    <!-- Метрики -->
    <div class="flex gap-4 justify-center pt-2">
      <div class="stat">
        <div class="label">Ответов</div>
        <div class="value">{total}</div>
      </div>
      <div class="stat">
        <div class="label">Средний RT</div>
        <div class="value">{avgRt} мс</div>
      </div>
      <div class="stat">
        <div class="label">% верных</div>
        <div class="value">{accuracyPct}%</div>
      </div>
    </div>

    <!-- Кнопка не добавляем: она уже есть в нижнем шаблоне страницы.
         Если хочешь локальную — раскомментируй строку ниже: -->
    <!-- <div><button class="btn" on:click={restart}>Ещё раз</button></div> -->
  </div>
{/if}

<style>
  .stat {
    padding: .8rem 1rem;
    border: 1px solid rgba(0,0,0,.1);
    border-radius: .8rem;
    background: #fff;
    color: #111827;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
  }
  .label { font-size: .8rem; opacity: .7; }
  .value { font-size: 1.2rem; font-weight: 600; }
  .btn { padding:.7rem 1.1rem; border-radius:.8rem; border:1px solid rgba(0,0,0,.2); background:#fff; color:#111827; cursor:pointer; font-weight:600; }
  .btn:hover { background:#f8fafc; }
</style>
