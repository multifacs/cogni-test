// lib/server/controllers/rhythm.ts
import { db } from '$lib/server/db';
import { results } from '$lib/server/db/schema';
import type { RhythmResult } from '$lib/rhythm/types';

export async function postRhythmResult(
	userId: string,
	difficulty: 'easy' | 'medium' | 'hard',
	rhythmResults: RhythmResult[]
): Promise<number> {
	const resultData = {
		difficulty,
		data: rhythmResults
	};

	const inserted = await db
		.insert(results)
		.values({
			userId,
			difficulty,
			results: JSON.stringify(resultData)
		})
		.returning({ id: results.id });

	return inserted[0].id;
}
