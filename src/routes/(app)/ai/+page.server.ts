import { redirect } from '@sveltejs/kit';
import { AI_SURVEY_PASSED_PERCENT } from '$lib/ai/questionnaire/types';
import { getAiSurveyProgress } from '$lib/server/db/controllers/ai-survey';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';
import { tests } from '$lib/tests';
import { fullFlow } from '../questionary/flows';
import type { PageServerLoad } from './$types';

export type AiStageStatus = 'done' | 'next' | 'locked';

export type AiStage = {
	id: 'survey' | 'ai-life' | 'tests' | 'classification';
	title: string;
	description: string;
	href: string;
	status: AiStageStatus;
};

function hasValue(v: unknown): boolean {
	if (v === null || v === undefined) return false;
	if (typeof v === 'string') return v.trim() !== '';
	return true;
}

/** Анкета считается пройденной при ≥10% заполненных полей profile_survey. */
function profileSurveyPercent(profileSurvey: Record<string, unknown> | null | undefined): number {
	if (!profileSurvey) return 0;
	const total = fullFlow.questions.length;
	if (total === 0) return 0;
	let answered = 0;
	for (const q of fullFlow.questions) {
		if (hasValue(profileSurvey[q.key as string])) answered++;
	}
	return Math.floor((answered / total) * 100);
}

export const load: PageServerLoad = async ({ cookies, parent }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		redirect(307, '/');
	}

	const { profileSurvey } = await parent();

	// Этап «Анкета»: ≥10% полей profile_survey
	const surveyDone = profileSurveyPercent(profileSurvey) >= 10;

	// Этап «ИИ»: ≥10% анкеты ИИ (единый контракт getAiSurveyProgress)
	const aiProgress = await getAiSurveyProgress(userId);
	const aiDone = aiProgress.percent >= AI_SURVEY_PASSED_PERCENT;

	// Этап «Тесты»: все 6 видимых диагностических тестов (НЕ TEST_ORDER)
	const visibleTests = tests.filter((t) => !t.hidden);
	const testSessionCounts = await getTestSessionCounts(userId);
	const testsDone = visibleTests.every((t) => (testSessionCounts[t.name] ?? 0) > 0);

	// Этап «Классификация»: есть сессия testType 'classification'
	const classificationDone = (testSessionCounts['classification'] ?? 0) > 0;

	const stageFlags: Record<AiStage['id'], boolean> = {
		survey: surveyDone,
		'ai-life': aiDone,
		tests: testsDone,
		classification: classificationDone
	};

	const stages: AiStage[] = [
		{
			id: 'survey',
			title: 'Анкета',
			description: 'Заполните базовую анкету о себе',
			href: '/questionary?from=ai',
			status: 'locked'
		},
		{
			id: 'ai-life',
			title: 'ИИ в жизни',
			description: 'Анкета о взаимодействии с ИИ',
			href: '/ai/ai-life',
			status: 'locked'
		},
		{
			id: 'tests',
			title: 'Диагностика',
			description: 'Все 6 когнитивных тестов',
			href: '/tests?from=ai',
			status: 'locked'
		},
		{
			id: 'classification',
			title: 'Классификация',
			description: 'Тест на классификацию',
			href: '/ai/classification',
			status: 'locked'
		}
	];

	let nextAssigned = false;
	for (const stage of stages) {
		if (stageFlags[stage.id]) {
			stage.status = 'done';
		} else if (!nextAssigned) {
			stage.status = 'next';
			nextAssigned = true;
		}
	}

	const allDone = stages.every((s) => s.status === 'done');

	return { stages, allDone };
};
