// routes/api/rhythm/results/+server.ts
import { json } from '@sveltejs/kit';
import { postRhythmResult } from '$lib/server/db/controllers/rhythm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, cookies }) => {
	try {
		const { userId, difficulty, results } = await request.json();

		// Validate input
		if (!userId) {
			return json({ error: 'User ID is required' }, { status: 400 });
		}

		if (!difficulty || !['easy', 'medium', 'hard'].includes(difficulty)) {
			return json({ error: 'Valid difficulty level is required' }, { status: 400 });
		}

		if (!results || !Array.isArray(results) || results.length === 0) {
			return json({ error: 'Results array is required' }, { status: 400 });
		}

		// Insert results into database
		const resultId = await postRhythmResult(userId, difficulty, results);

		return json({
			success: true,
			id: resultId,
			message: `${difficulty} results saved successfully`
		});
	} catch (error) {
		console.error('Error saving rhythm results:', error);
		return json(
			{
				error: 'Failed to save results',
				details: error instanceof Error ? error.message : 'Unknown error'
			},
			{ status: 500 }
		);
	}
};
