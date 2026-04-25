<script lang="ts">
  import NBackStreamGame from "./NBackStreamGame.svelte";
  let running = false;
</script>

{#if !running}

    <p>Сравнивайте текущую фигуру или цифру с фигурой или цифрой, 
      предложенной 1/2/3-хода назад в зависимости от выбранного Вами режима. </p>

{:else}
  <NBackStreamGame />
{/if}

<style>
  .btn { padding:.6rem 1rem; border:1px solid rgba(0,0,0,.2); border-radius:.8rem; background:transparent; cursor:pointer; }
  .btn:hover { background: rgba(0,0,0,.05); }
</style>
