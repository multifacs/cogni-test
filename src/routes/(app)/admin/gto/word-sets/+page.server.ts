import type { PageServerLoad, Actions } from './$types';
import { fail } from '@sveltejs/kit';
import {
	getWordSets,
	createWordSet,
	updateWordSet,
	generateWordSets,
	deleteWordSet
} from '$lib/server/db/controllers/gto';
import { filterWords } from '$lib/words';

export const load: PageServerLoad = async () => {
	const wordSets = await getWordSets();
	return { wordSets };
};

export const actions: Actions = {
	create: async ({ request }) => {
		const data = await request.formData();
		const wordsRaw = data.get('words') as string;
		if (!wordsRaw) return fail(400, { error: 'Слова обязательны' });

		const words = wordsRaw
			.split(/[,\n]/)
			.map((w) => w.trim().toLowerCase())
			.filter(Boolean);

		if (words.length !== 5) {
			return fail(400, { error: 'Нужно ровно 5 слов' });
		}

		try {
			await createWordSet(words);
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: e.message });
		}
	},

	update: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		const wordsRaw = data.get('words') as string;
		if (!id || !wordsRaw) return fail(400, { error: 'ID и слова обязательны' });

		const words = wordsRaw
			.split(/[,\n]/)
			.map((w) => w.trim().toLowerCase())
			.filter(Boolean);

		if (words.length !== 5) {
			return fail(400, { error: 'Нужно ровно 5 слов' });
		}

		try {
			await updateWordSet(id, words);
			return { success: true };
		} catch (e: any) {
			return fail(500, { error: e.message });
		}
	},

	generate: async ({ request, fetch }) => {
		const data = await request.formData();
		const countRaw = data.get('count') as string;
		const count = parseInt(countRaw, 10);
		if (!count || count < 1) {
			return fail(400, { error: 'Некорректное количество' });
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

	delete: async ({ request }) => {
		const data = await request.formData();
		const id = data.get('id') as string;
		if (!id) return fail(400, { error: 'ID обязателен' });

		try {
			await deleteWordSet(id);
			return { success: true };
		} catch (e: any) {
			return fail(400, { error: e.message });
		}
	}
};
