<script lang="ts">
  import MemoryMatchGame, { type FullResult } from "./MemoryMatchGame.svelte";
  import ResultsChart from "./ResultsChart.svelte";
  import { toDbAttempts } from "./results-adapter";

  let running = true;
  let finalResult: FullResult | null = null;

  async function sendToDb(result: FullResult) {
    try {
      const attempts = toDbAttempts(result);
      await fetch("/tests/memoryMatch/playground", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ results: attempts })
      });
    } catch (e) {
      console.error("[memory-match] DB write error:", e);
    }
  }

  function handleDone(e: CustomEvent<FullResult>) {
    finalResult = e.detail;
    running = false;
    sendToDb(finalResult);
  }

  function restart() {
    running = true;
    finalResult = null;
  }
</script>

<div class="wrap">
  {#if running}
    <MemoryMatchGame on:done={handleDone} />
  {:else if finalResult}
    <div class="head">
      <h1>Memory Match — результаты</h1>
      <button class="btn" on:click={restart}>Пройти заново</button>
    </div>

    <ResultsChart perStage={finalResult.perStage} />
  {/if}
</div>

<style>
  .wrap { padding: 1rem; }
  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: .75rem;
  }
  h1 {
    font-weight: 800;
    font-size: 1.25rem;
    margin: 0;
  }
  .btn {
    padding: .6rem 1rem;
    border-radius: .8rem;
    border: 1px solid rgba(0,0,0,.2);
    background: transparent;
    cursor: pointer;
  }
  .btn:hover {
    background: rgba(0,0,0,.05);
  }
</style>
