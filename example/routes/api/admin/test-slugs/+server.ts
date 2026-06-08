import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { testAttempt } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

export async function GET() {
	try {
		const result = await db
			.selectDistinct({
				slug: testAttempt.testSlug
			})
			.from(testAttempt)
			.orderBy(testAttempt.testSlug);

		const slugs = result.map((r) => r.slug);
		return json(slugs);
	} catch (error) {
		console.error('Error fetching test slugs:', error);
		return json({ error: 'Failed to fetch test slugs' }, { status: 500 });
	}
}
