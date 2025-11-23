<script lang="ts">
  import type { Stimulus } from "./types";
  import { fly } from "svelte/transition";
  export let current: Stimulus | null = null;

  function shapeSvg(shape: string, color: string) {
    if (shape === 'circle') return `<circle cx="64" cy="64" r="48" fill="${color}"/>`;
    if (shape === 'square') return `<rect x="24" y="24" width="80" height="80" fill="${color}"/>`;
    if (shape === 'triangle') return `<polygon points="64,16 112,112 16,112" fill="${color}"/>`;
    if (shape === 'diamond') return `<polygon points="64,8 120,64 64,120 8,64" fill="${color}"/>`;
    if (shape === 'hex') return `<polygon points="32,24 96,24 120,64 96,104 32,104 8,64" fill="${color}"/>`;
    if (shape === 'star') return `<polygon points="64,12 78,50 118,50 85,74 96,112 64,90 32,112 43,74 10,50 50,50" fill="${color}"/>`;
    return `<rect x="24" y="24" width="80" height="80" fill="${color}"/>`;
  }
</script>

<div class="w-full grid place-items-center select-none">
  <div class="stage">
    {#if current}
      {#key current.idx}
        <!-- ЯКОРЬ: стабильно по центру -->
        <div class="anchor">
          <!-- ДВИЖЕТСЯ только эта капсула -->
          <div class="anim" in:fly={{ x: 240, y: 0, duration: 180 }} out:fly={{ x: -240, y: 0, duration: 180 }}>
            {#if current.domain === 'figures'}
              <svg class="svg" viewBox="0 0 128 128" width="180" height="180" aria-label="figure">
                {@html shapeSvg(current.payload.shape, current.payload.color)}
              </svg>
            {:else}
              <div class="num">{current.payload.value}</div>
            {/if}
          </div>
        </div>
      {/key}
    {/if}
  </div>
</div>

<style>
  .stage {
    width: 260px; height: 260px;
    position: relative;
    border-radius: 16px;
    border: 1px solid rgba(0,0,0,.1);
    background: #fff; color: #111827;
    box-shadow: 0 1px 2px rgba(0,0,0,.04);
    overflow: hidden; /* чтобы выезд был аккуратный */
  }

  /* Якорь всегда строго по центру */
  .anchor {
    position: absolute;
    top: 50%; left: 50%;
    width: 180px; height: 180px;
    transform: translate(-50%, -50%);
    display: grid; place-items: center;
    pointer-events: none; /* анимация не перехватывает клики */
  }

  /* Капсула, которую двигаем; вертикаль остаётся фиксированной */
  .anim {
    will-change: transform;
  }

  .svg { display: block; }           /* фикс базовой линии, чтобы не “падало” вниз */
  .num { font-size: 72px; font-weight: 700; line-height: 1; }
</style>
