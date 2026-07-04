import type { PageServerLoad } from './$types';
import { getGtoSessionById } from '$lib/server/db/controllers/gto';
import { error, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
	const userId = cookies.get('user_id');
	if (!userId) redirect(307, '/');

	const sessionDetail = await getGtoSessionById(params.id);
	if (!sessionDetail) error(404, 'Сессия не найдена');

	const participant = sessionDetail.participants.find((p) => p.userId === userId);
	if (!participant) error(403, 'Вы не являетесь участником этой сессии');

	if (participant.hasCompletedTests) {
		if (!participant.hasSubmittedWords) {
			redirect(307, `/gto/session/${params.id}/words`);
		}
		redirect(307, '/gto');
	}

	// Load test data for current test (words for munsterberg/memory, silhouettes for campimetry)
	const TEST_ORDER = ['stroop', 'math', 'munsterberg', 'campimetry', 'memory', 'swallow'] as const;
	const currentTestType = TEST_ORDER[sessionDetail.currentTestIndex] ?? TEST_ORDER[0];

	const data: {
		session: typeof sessionDetail;
		participant: typeof participant;
		currentTestIndex: number;
		currentTestType: string;
		words?: string[];
		silhouettes?: Record<string, string>;
	} = {
		session: sessionDetail,
		participant,
		currentTestIndex: sessionDetail.currentTestIndex,
		currentTestType
	};

	if (currentTestType === 'munsterberg' || currentTestType === 'memory') {
		const response = await fetch('/words');
		const text = await response.text();
		const words = text
			.split('\n')
			.map((x) => x.replace(/(\r\n|\n|\r)/gm, ''))
			.filter((x) => x.length <= 9 && x !== 'TRUE' && x !== 'true');
		data.words = words;
	}

	if (currentTestType === 'campimetry') {
		data.silhouettes = {
			bird: '/campimetry/bird.svg',
			butterfly: '/campimetry/butterfly.svg',
			cat: '/campimetry/cat.svg',
			dog: '/campimetry/dog.svg',
			shark: '/campimetry/shark.svg'
		};
	}

	return data;
};
