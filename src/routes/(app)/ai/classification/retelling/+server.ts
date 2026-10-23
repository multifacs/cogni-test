import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	ControllerError,
	saveClassificationRetelling
} from '$lib/server/db/controllers/classification';

/** Этап 2 (пересказ): payload = { sessionId, retelling }. */
function parsePayload(body: unknown): { sessionId: string; retelling: string } | null {
	if (body === null || typeof body !== 'object' || Array.isArray(body)) return null;
	const { sessionId, retelling } = body as Record<string, unknown>;
	// sessionId — валидное число/строка, не null/object.
	if (typeof sessionId !== 'string' && typeof sessionId !== 'number') return null;
	if (typeof retelling !== 'string') return null;
	return { sessionId: String(sessionId), retelling };
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
		await saveClassificationRetelling(userId, payload.sessionId, payload.retelling);
		return json({ ok: true }, { status: 201 });
	} catch (e) {
		if (e instanceof ControllerError) {
			return json({ error: e.message }, { status: e.status });
		}
		return json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 400 });
	}
};
