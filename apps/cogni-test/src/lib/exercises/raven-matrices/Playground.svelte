<script lang="ts">
  import RavenMatricesGame from './RavenMatricesGame.svelte';
  import ResultsChart from './ResultsChart.svelte';
  import type { RavenFullResult, RavenTestGenerationOptions } from './types';

  let running = true;
  let finalResult: RavenFullResult | null = null;

  const options: RavenTestGenerationOptions = {
    count: 10,
    mode: 'default',
    answerCount: 6,
    distractorPolicy: 'balanced'
  };

  function handleDone(event: CustomEvent<RavenFullResult>) {
    finalResult = event.detail;
    running = false;
  }

  function restart() {
    finalResult = null;
    running = true;
  }
</script>

<div class="page-shell">
  {#if running}
    <RavenMatricesGame {options} on:done={handleDone} />
  {:else if finalResult}
    <section class="result-shell">
      <div class="result-header">
        <div>
          <p class="eyebrow">Результаты</p>
          <h1>Матрицы Равена</h1>
        </div>
        <button type="button" on:click={restart}>Пройти заново</button>
      </div>

      <ResultsChart result={finalResult} />
    </section>
  {/if}
</div>

<style>
  .page-shell {
    width: 100%;
    padding: clamp(0.45rem, 1.8vw, 0.9rem);
  }

  .result-shell {
    width: min(100%, 720px);
    margin: 0 auto;
    display: grid;
    gap: 0.65rem;
  }

  .result-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    padding: 0.75rem 0.9rem;
    border-radius: 1.15rem;
    background: linear-gradient(135deg, #eef6ff, #fff7ed);
    border: 1px solid rgb(148 163 184 / 0.24);
  }

  .eyebrow {
    margin: 0 0 0.15rem;
    color: #64748b;
    font-size: 0.72rem;
    font-weight: 800;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }

  h1 {
    margin: 0;
    color: #111827;
    font-size: clamp(1.35rem, 5vw, 2rem);
  }

  button {
    border: 0;
    border-radius: 0.9rem;
    padding: 0.72rem 0.9rem;
    background: #172033;
    color: white;
    font-weight: 800;
    cursor: pointer;
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    .result-header {
      align-items: stretch;
      flex-direction: column;
    }
  }
</style>
