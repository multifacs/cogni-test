// Import the database instance
import { db } from '$lib/server/db';

// Import the session table schema
import { session } from '$lib/server/db/schema';

// Import Drizzle ORM helpers
import { eq, inArray, sql, and } from 'drizzle-orm';

// Fetch a count of sessions per test type for a user
export async function getTestSessionCounts(
	userId: string, // ID of the user whose sessions we are counting
	testTypes?: string[] // Optional list of test types to filter by
): Promise<Record<string, number>> {
	// Build the WHERE condition dynamically
	const whereCondition =
		testTypes && testTypes.length > 0
			? // If testTypes are provided, filter by both userId and testType list
				and(eq(session.userId, userId), inArray(session.testType, testTypes))
			: // Otherwise, only filter by userId
				eq(session.userId, userId);

	// Execute the query
	const rows: { testType: string; count: number }[] = await db
		.select({
			// Select the test type column
			testType: session.testType,

			// Count how many rows exist per test type
			count: sql<number>`count(*)`.as('count')
		})
		// Specify the table
		.from(session)
		// Apply the dynamically built WHERE condition
		.where(whereCondition)
		// Group results by test type so count(*) works per type
		.groupBy(session.testType);

	// Convert rows into an object like { testType: count }
	return Object.fromEntries(rows.map((r) => [r.testType, r.count]));
}
