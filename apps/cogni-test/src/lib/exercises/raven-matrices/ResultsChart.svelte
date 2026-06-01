<script lang="ts">
  import type { RavenFullResult } from './types';
  import { formatMs, resultRows, summary } from './results-adapter';

  export let result: RavenFullResult;

  $: rows = resultRows(result);
  $: s = summary(result);
</script>

<section class="results-card">
  <div class="summary-grid">
    <div class="metric primary">
      <span class="label">Правильность</span>
      <strong>{Math.round(s.accuracy * 100)}%</strong>
    </div>
    <div class="metric">
      <span class="label">Верно</span>
      <strong>{s.correctCount}/{s.totalQuestions}</strong>
    </div>
    <div class="metric">
      <span class="label">Среднее время</span>
      <strong>{formatMs(s.averageResponseTimeMs)}</strong>
    </div>
    <div class="metric">
      <span class="label">Общее время</span>
      <strong>{formatMs(s.totalDurationMs)}</strong>
    </div>
  </div>

  <div class="bars" aria-label="Правильность по заданиям">
    {#each rows as row (row.index)}
      <span class:ok={row.isCorrect} class:bad={!row.isCorrect} title={`Задание ${row.index}: ${row.isCorrect ? 'верно' : 'ошибка'}`}>{row.index}</span>
    {/each}
  </div>

  <div class="attempt-list">
    {#each rows as row (row.index)}
      <article class:ok-card={row.isCorrect} class:bad-card={!row.isCorrect}>
        <b>{row.index}</b>
        <span>{row.isCorrect ? 'Верно' : 'Ошибка'}</span>
        <small>{formatMs(row.responseTimeMs)} · сложн. {row.difficultyLevel} · {row.taskClassLabel}</small>
      </article>
    {/each}
  </div>
</section>

<style>
  .results-card {
    display: grid;
    gap: 0.8rem;
    padding: clamp(0.8rem, 2.4vw, 1rem);
    border: 1px solid rgb(148 163 184 / 0.24);
    border-radius: 1.25rem;
    background: linear-gradient(145deg, #ffffff 0%, #f7fbff 100%);
    box-shadow: 0 12px 30px rgb(15 23 42 / 0.08);
  }

  .summary-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.55rem;
  }

  .metric {
    min-width: 0;
    border-radius: 0.95rem;
    padding: 0.72rem;
    background: #f5f7fb;
    border: 1px solid rgb(148 163 184 / 0.18);
  }

  .metric.primary {
    background: #f0f9ff;
  }

  .label {
    display: block;
    margin-bottom: 0.2rem;
    font-size: 0.72rem;
    color: #64748b;
  }

  strong {
    color: #111827;
    font-size: clamp(1.05rem, 4.5vw, 1.45rem);
  }

  .bars {
    display: grid;
    grid-template-columns: repeat(10, minmax(0, 1fr));
    gap: 0.32rem;
  }

  .bars span {
    display: grid;
    min-height: 1.85rem;
    place-items: center;
    border-radius: 0.55rem;
    color: white;
    font-size: 0.78rem;
    font-weight: 800;
  }

  .ok {
    background: #3ba96b;
  }

  .bad {
    background: #d9574f;
  }

  .attempt-list {
    display: grid;
    gap: 0.42rem;
    max-height: 45vh;
    overflow: auto;
    padding-right: 0.15rem;
  }

  article {
    display: grid;
    grid-template-columns: 2rem 4.3rem 1fr;
    gap: 0.5rem;
    align-items: center;
    border-radius: 0.82rem;
    padding: 0.48rem 0.55rem;
    border: 1px solid rgb(148 163 184 / 0.18);
    background: #fbfdff;
  }

  article b {
    display: grid;
    width: 1.6rem;
    height: 1.6rem;
    place-items: center;
    border-radius: 999px;
    background: #e2e8f0;
    color: #334155;
    font-size: 0.8rem;
  }

  article span {
    font-weight: 800;
  }

  article small {
    color: #64748b;
    font-size: 0.78rem;
    line-height: 1.25;
  }

  .ok-card span {
    color: #15803d;
  }

  .bad-card span {
    color: #b42318;
  }

  @media (max-width: 640px) {
    .summary-grid {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }

    article {
      grid-template-columns: 1.8rem 4rem 1fr;
      gap: 0.35rem;
    }
  }
</style>
