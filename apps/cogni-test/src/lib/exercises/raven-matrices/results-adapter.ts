import type { RavenFullResult, TaskClass } from './types';

export const TASK_CLASS_LABELS: Record<TaskClass, string> = {
  attribute_reasoning: 'Признаки',
  row_column_factorization: 'Строки/столбцы',
  quantity_reasoning: 'Количество',
  spatial_movement: 'Движение',
  grid_bitmask: 'Сетка',
  logical_set_reasoning: 'Логика',
  structural_composition: 'Сборка фигур',
  regional_texture_reasoning: 'Области',
  vector_primitive_reasoning: 'Дуги/линии'
};

export function taskClassLabel(taskClass: TaskClass): string {
  return TASK_CLASS_LABELS[taskClass] ?? taskClass;
}

export function formatMs(ms: number): string {
  if (!Number.isFinite(ms)) return '—';
  if (ms < 1000) return `${Math.round(ms)} мс`;
  return `${(ms / 1000).toFixed(1)} с`;
}

export function summary(result: RavenFullResult) {
  return {
    totalQuestions: result.totalQuestions,
    correctCount: result.correctCount,
    accuracy: result.accuracy,
    totalDurationMs: result.totalDurationMs,
    averageResponseTimeMs: result.averageResponseTimeMs
  };
}

export function resultRows(result: RavenFullResult) {
  return result.answers.map((answer, index) => ({
    index: index + 1,
    isCorrect: answer.isCorrect,
    responseTimeMs: answer.responseTimeMs,
    difficultyLevel: answer.difficultyLevel,
    taskClassLabel: taskClassLabel(answer.taskClass)
  }));
}
