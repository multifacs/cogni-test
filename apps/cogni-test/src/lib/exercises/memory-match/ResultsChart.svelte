<script lang="ts">
  export let perStage:
    { stage: number; durationMs: number; cardsCount: number; flipsCount: number; mistakes: number }[] = [];

  $: rows = perStage
    .slice()
    .sort((a, b) => a.stage - b.stage)
    .map((s) => ({
      stage: s.stage,
      durationSec: +(s.durationMs / 1000).toFixed(2),
      efficiency: +(s.flipsCount / s.cardsCount).toFixed(2),
      flips: s.flipsCount,
      mistakes: s.mistakes
    }));

  $: totalTimeSec = +(rows.reduce((acc, r) => acc + r.durationSec, 0)).toFixed(2);
  $: totalFlips = rows.reduce((a, r) => a + r.flips, 0);
  $: totalMistakes = rows.reduce((a, r) => a + r.mistakes, 0);
  $: meanEff = rows.length ? +(rows.reduce((a, r) => a + r.efficiency, 0) / rows.length).toFixed(2) : 0;

  // увеличил viewBox и PAD_TOP
  const VBX = 100, VBY = 70;
  const PAD_LEFT = 10, PAD_RIGHT = 4, PAD_TOP = 14, PAD_BOTTOM = 16;
  $: plotW = VBX - PAD_LEFT - PAD_RIGHT;
  $: plotH = VBY - PAD_TOP - PAD_BOTTOM;

  $: maxEff = rows.length ? Math.max(...rows.map((r) => r.efficiency)) : 1;

  function xPos(i: number) {
    return PAD_LEFT + ((i + 0.5) / rows.length) * plotW;
  }
  function barHeight(eff: number) {
    return (eff / maxEff) * plotH;
  }
</script>

<div class="wrap space-y-4">
  {#if rows.length}
    <svg viewBox={`0 0 ${VBX} ${VBY}`} class="chart">
      {#each [0, 0.25, 0.5, 0.75, 1] as frac}
        {#if rows.length}
          <line
            x1={PAD_LEFT}
            y1={PAD_TOP + plotH - frac * plotH}
            x2={PAD_LEFT + plotW}
            y2={PAD_TOP + plotH - frac * plotH}
            class="grid"
          />
          <text
            x={PAD_LEFT - 2}
            y={PAD_TOP + plotH - frac * plotH + 2}
            class="axis-y"
            text-anchor="end"
          >
            {(maxEff * frac).toFixed(2)}
          </text>
        {/if}
      {/each}

      {#each rows as r, i}
        <rect
          x={xPos(i) - 6}
          y={PAD_TOP + plotH - barHeight(r.efficiency)}
          width={12}
          height={barHeight(r.efficiency)}
          class="bar"
        />
        <text
          x={xPos(i)}
          y={PAD_TOP + plotH - barHeight(r.efficiency) - 2}
          class="val"
          text-anchor="middle"
        >
          {r.efficiency}
        </text>
        <text
          x={xPos(i)}
          y={PAD_TOP + plotH + 8}
          class="axis-x"
          text-anchor="middle"
        >
          {r.stage}
        </text>
      {/each}

      <text
        x={PAD_LEFT + plotW / 2}
        y={PAD_TOP - 6}
        class="title"
        text-anchor="middle"
      >Эффективность открытий (flips/cards)</text>
      <text
        x={PAD_LEFT + plotW / 2}
        y={VBY - 2}
        class="title"
        text-anchor="middle"
      >Этап</text>
    </svg>

    <table class="metrics">
      <thead>
        <tr>
          <th>Этап</th>
          <th>Время (с)</th>
          <th>Открытия</th>
          <th>Ошибки</th>
          <th>Эффективность</th>
        </tr>
      </thead>
      <tbody>
        {#each rows as r}
          <tr>
            <td>{r.stage}</td>
            <td>{r.durationSec}</td>
            <td>{r.flips}</td>
            <td>{r.mistakes}</td>
            <td>{r.efficiency}</td>
          </tr>
        {/each}
        <tr class="total">
          <td>Итого</td>
          <td>{totalTimeSec}</td>
          <td>{totalFlips}</td>
          <td>{totalMistakes}</td>
          <td>{meanEff}</td>
        </tr>
      </tbody>
    </table>
  {:else}
    <div class="muted">Нет данных для отображения.</div>
  {/if}
</div>

<style>
  .chart {
    width: 100%;
    height: 280px;
    border: 1px solid rgba(0,0,0,.12);
    border-radius: 1rem;
    background: var(--panel, rgba(255,255,255,.02));
  }
  .grid { stroke: currentColor; opacity: .1; stroke-width: .3; }
  .axis-x, .axis-y, .title, .val { fill: currentColor; }
  .axis-x, .axis-y { font-size: 3px; opacity: .7; }
  .title { font-size: 3.5px; opacity: .8; font-weight: 600; }
  .bar { fill: #2f80ed; opacity: .85; }
  .val { font-size: 3px; font-weight: 700; }
  .metrics {
    width: 100%;
    border-collapse: collapse;
    margin-top: .5rem;
  }
  .metrics th, .metrics td {
    border: 1px solid rgba(0,0,0,.15);
    padding: .4rem .6rem;
    text-align: center;
    font-size: .9rem;
  }
  .metrics th { background: rgba(0,0,0,.05); font-weight: 600; }
  .metrics .total { font-weight: 700; background: rgba(47,128,237,.1); }
</style>
