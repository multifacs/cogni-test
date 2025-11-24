<script lang="ts">
  import NBackStreamGame from "./NBackStreamGame.svelte";
  let running = false;
</script>

{#if !running}
  <div class="p-6 space-y-4 max-w-2xl">
    <p>Сравнивайте текущий стимул с 1/2/3-ходами назад. Для фигур целевой признак выбирается случайно на весь прогон (форма или цвет) и показывается перед стартом. Для чисел — сравнение на равенство.</p>
  </div>
{:else}
  <NBackStreamGame />
{/if}

<style>
  .btn { padding:.6rem 1rem; border:1px solid rgba(0,0,0,.2); border-radius:.8rem; background:transparent; cursor:pointer; }
  .btn:hover { background: rgba(0,0,0,.05); }
</style>
