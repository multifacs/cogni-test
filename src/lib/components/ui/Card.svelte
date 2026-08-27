<script lang="ts">
  export let className = "";
</script>

<div class="card {className}">
  <slot />
</div>

<style>
  .card {
    background-color: #fff;
    border-radius: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 2rem;
    gap: 1rem;
    width: fit-content;
    height: fit-content;
  }
</style>
