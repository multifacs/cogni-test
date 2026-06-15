import type { TaskClass } from './types';

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

export type RavenAttemptRow = {
	taskId: string;
	taskIndex: number;
	taskClass: TaskClass;
	difficultyLevel: number;
	difficultyScore: number;
	rules: string;
	skillTags: string;
	selectedIndex: number | null;
	correctIndex: number;
	selectedFamily: string | null;
	isCorrect: boolean;
	responseTimeMs: number;
	seed: string;
};

export function summary(attempts: RavenAttemptRow[]) {
  const totalQuestions = attempts.length;
  const correctCount = attempts.filter((a) => a.isCorrect).length;
  const accuracy = totalQuestions ? correctCount / totalQuestions : 0;
  const totalDurationMs = attempts.reduce((sum, a) => sum + a.responseTimeMs, 0);
  const averageResponseTimeMs = totalQuestions
    ? Math.round(totalDurationMs / totalQuestions)
    : 0;
  return { totalQuestions, correctCount, accuracy, totalDurationMs, averageResponseTimeMs };
}

export function resultRows(attempts: RavenAttemptRow[]) {
  return attempts.map((answer, index) => ({
    index: index + 1,
    isCorrect: answer.isCorrect,
    responseTimeMs: answer.responseTimeMs,
    difficultyLevel: answer.difficultyLevel,
    taskClassLabel: taskClassLabel(answer.taskClass)
  }));
}
