import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { testAttempt } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function GET({ url }) {
	try {
		const slug = url.searchParams.get('slug');

		let query = db.select().from(testAttempt).orderBy((t) => t.startedAt);

		if (slug) {
			query = query.where(eq(testAttempt.testSlug, slug));
		}

		const attempts = await query;
		return json(attempts);
	} catch (error) {
		console.error('Error fetching attempts:', error);
		return json({ error: 'Failed to fetch attempts' }, { status: 500 });
	}
}

export async function DELETE({ params }) {
	try {
		const { id } = params;

		await db.delete(testAttempt).where(eq(testAttempt.id, id));

		return json({ success: true });
	} catch (error) {
		console.error('Error deleting attempt:', error);
		return json({ error: 'Failed to delete attempt' }, { status: 500 });
	}
}
