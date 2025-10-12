<script lang="ts">
  import type { ClickEvent } from "./types";
  export let clicks: ClickEvent[] = [];
  const PAD = 36;
  const W = 680, H = 280;

  $: ys = clicks.map(c => c.rtMs);
  $: minY = Math.min(...ys, 0);
  $: maxY = Math.max(...ys, 100);
  $: avg = clicks.length ? (ys.reduce((a,b)=>a+b,0)/ys.length) : null;

  const yScale = (v:number) => {
    const a = (v - minY) / (maxY - minY || 1);
    return H - PAD - a*(H - 2*PAD);
  };
  const xScale = (i:number) => {
    const a = (i - 1) / Math.max(1, clicks.length - 1);
    return PAD + a * (W - 2*PAD);
  };
  $: linePath = clicks.length ? clicks.map((c,i)=> (i===0?'M':'L') + xScale(i+1)+','+yScale(c.rtMs)).join(' ') : '';
</script>

<svg {W} {H} viewBox={`0 0 ${W} ${H}`} class="w-full max-w-3xl text-gray-900">
  <line x1={PAD} y1={H-PAD} x2={W-PAD} y2={H-PAD} stroke="#cbd5e1" />
  <line x1={PAD} y1={PAD}    x2={PAD}    y2={H-PAD} stroke="#cbd5e1" />

  <text x={W/2} y={H-6} font-size="11" text-anchor="middle" fill="#475569">Ответы</text>
  <text x="10"   y={PAD-12} font-size="11" fill="#475569">Время реакции, мс</text>

  {#if clicks.length>1}
    <path d={linePath} fill="none" stroke="#94a3b8" stroke-width="1.5" />
  {/if}

  {#each clicks as c, i}
    <circle cx={xScale(i+1)} cy={yScale(c.rtMs)} r="5" fill={c.isCorrect ? '#10B981' : '#EF4444'} />
  {/each}

  {#if avg !== null}
    <line x1={PAD} x2={W-PAD} y1={yScale(avg)} y2={yScale(avg)} stroke="#64748b" stroke-dasharray="4 4"/>
    <text x={W-PAD} y={yScale(avg)-6} font-size="10" text-anchor="end" fill="#64748b">среднее ~ {Math.round(avg)} мс</text>
  {/if}
</svg>
