// Import static test definitions
import { tests } from '$lib/tests';

// Import age-related helpers
import { getFeaturesFromDB } from '$lib/server/age/getFeaturesFromDB';
import { runAgeModel } from '$lib/server/age/runAgeModel';
import type { PageServerLoad } from './$types';

// Import the session-count query
import { getTestSessionCounts } from '$lib/server/db/controllers/test';

export const load: PageServerLoad = async ({ cookies }) => {
	// Read the user ID from cookies
	const userId = cookies.get('user_id');

	// Default values for optional data
	let predictedAge: number | null = null;
	let testSessionCounts: Record<string, number> = {};

	// If the user is not logged in, return minimal data
	if (!userId) {
		return { tests };
	}

	// Fetch features used for age prediction
	const features = await getFeaturesFromDB(userId);

	// Run the ML model only if features exist
	if (features) {
		predictedAge = await runAgeModel(features);
	}

	// Fetch per-test-type session counts for this user
	testSessionCounts = await getTestSessionCounts(userId);

	// Debug logging (server-side only)
	console.log({ predictedAge, testSessionCounts });

	// Data returned here is available as `data` in +page.svelte
	return {
		tests,
		userId,
		predictedAge,
		testSessionCounts
	};
};
