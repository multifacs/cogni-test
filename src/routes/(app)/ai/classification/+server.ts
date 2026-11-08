import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	ControllerError,
	saveClassificationWords
} from '$lib/server/db/controllers/classification';
import type { ClassificationGroupInput } from '$lib/server/db/controllers/classification';

/**
 * Этап 1 (слова): payload = { groups }. Поле retelling больше НЕ принимается —
 * пересказ сдаётся отдельным маршрутом retelling/+server.ts.
 */
function parsePayload(body: unknown): ClassificationGroupInput[] | null {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
	const { groups } = body as Record<string, unknown>;
	if (!Array.isArray(groups)) return null;
	const parsedGroups: ClassificationGroupInput[] = [];
	for (const group of groups) {
		if (group === null || typeof group !== 'object' || Array.isArray(group)) return null;
		const { words, feature } = group as Record<string, unknown>;
		if (!Array.isArray(words) || words.some((w) => typeof w !== 'string')) return null;
		if (typeof feature !== 'string') return null;
		parsedGroups.push({ words, feature });
	}
	return parsedGroups;
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

	const groups = parsePayload(body);
	if (!groups) {
		return json({ error: 'Invalid payload' }, { status: 400 });
	}

	try {
		const sessionId = await saveClassificationWords(userId, groups);
		return json({ ok: true, sessionId }, { status: 201 });
	} catch (e) {
		if (e instanceof ControllerError) {
			return json({ error: e.message }, { status: e.status });
		}
		return json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 400 });
	}
};
