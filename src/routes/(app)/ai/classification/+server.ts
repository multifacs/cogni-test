import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { saveClassificationResult } from '$lib/server/db/controllers/classification';
import type {
	ClassificationGroupInput,
	ClassificationPayloadInput
} from '$lib/server/db/controllers/classification';

/** Валидация payload на границе: не-объект, groups не массив, элементы/words не той формы → 400. */
function parsePayload(body: unknown): ClassificationPayloadInput | null {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
	const { groups, retelling } = body as Record<string, unknown>;
	if (!Array.isArray(groups)) return null;
	if (typeof retelling !== 'string') return null;
	const parsedGroups: ClassificationGroupInput[] = [];
	for (const group of groups) {
		if (group === null || typeof group !== 'object' || Array.isArray(group)) return null;
		const { words, feature } = group as Record<string, unknown>;
		if (!Array.isArray(words) || words.some((w) => typeof w !== 'string')) return null;
		if (typeof feature !== 'string') return null;
		parsedGroups.push({ words, feature });
	}
	return { groups: parsedGroups, retelling };
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	const userId = cookies.get('user_id');
	if (!userId) return json({ error: 'Unauthorized' }, { status: 401 });

	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, { status: 400 });
	}

	const payload = parsePayload(body);
	if (!payload) {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	try {
		const sessionId = await saveClassificationResult(userId, payload);
		return json({ ok: true, sessionId }, { status: 201 });
	} catch (e) {
		return json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 400 });
	}
};
