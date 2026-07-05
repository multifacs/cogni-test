import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	getAuthorizedUsers,
	getGtoSessions,
	createGtoSession,
	getWordSets,
	generateWordSets,
	deleteWordSet
} from '$lib/server/db/controllers/gto';
import { filterWords } from '$lib/words';

export const load: PageServerLoad = async () => {
	const users = await getAuthorizedUsers();
	const sessions = await getGtoSessions();
	const wordSets = await getWordSets();
	return { users, sessions, wordSets };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const name = data.get('name') as string;
		const participantIds = data.getAll('participantIds') as string[];
		const wordsRaw = data.get('words') as string;

		if (!name || participantIds.length === 0) {
			return fail(400, { error: 'Name and at least one participant required' });
		}

		// Parse words (comma-separated or newline-separated)
		const words = wordsRaw
			? wordsRaw
					.split(/[,\n]/)
					.map((w) => w.trim().toLowerCase())
					.filter(Boolean)
					.slice(0, 5)
			: [];

		const gtoSessionId = await createGtoSession(
			name,
			'cognitive-age',
			participantIds,
			words
		);
		return { success: true, gtoSessionId };
	},
	generateWordSets: async ({ request, fetch }) => {
		const data = await request.formData();
		const countRaw = data.get('count') as string;
		const count = parseInt(countRaw, 10);
		if (!count || count < 1) {
			return fail(400, { error: 'Invalid count' });
		}

		const response = await fetch('/words');
		if (!response.ok) {
			return fail(500, { error: 'Не удалось прочитать файл слов' });
		}
		const text = await response.text();
		const allWords = filterWords(text);
		await generateWordSets(count, allWords);
		return { success: true };
	},
	deleteWordSet: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		if (!id) return fail(400, { error: 'ID required' });
		await deleteWordSet(id);
		return { success: true };
	}
};
