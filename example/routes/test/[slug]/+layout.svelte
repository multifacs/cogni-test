<script>
  let { children } = $props();
</script>

<div class="test-wrapper">
  {@render children()}
</div>

<style>
  .test-wrapper {
    --test-color:white;
    --test-size: 1.2rem;
    --test-weight: 400;
    --test-line-height: 1.6;
    --test-font: 'Inter', sans-serif;
    
    /* padding: 2rem;
    max-width: 800px;
    margin: 0 auto; */
  }
  
  /* Общие стили для любого текста внутри тестов */
  .test-wrapper :global(p), .test-wrapper :global(label) {
    color: var(--test-color);
    font-size: var(--test-size);
    font-weight: var(--test-weight);
    line-height: var(--test-line-height);
    font-family: var(--test-font);
  }
  
  .test-wrapper :global(h2) {
    color: var(--test-color);
    font-size: calc(var(--test-size) * 1.5);
    font-weight: 600;
    margin-bottom: 1rem;
  }
</style>