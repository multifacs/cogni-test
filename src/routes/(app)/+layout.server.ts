import { getUserById } from '$lib/server/db';
import type { User } from '$lib/types/index.js';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { SelectProfileSurvey } from '$lib/server/db/schema';
import { getProfileSurvey } from '$lib/server/db/controllers/survey';
import { tests } from '$lib/tests';
import { getTestSessionCounts } from '$lib/server/db/controllers/test';

export const load: LayoutServerLoad = async ({ cookies, url }) => {
	const userId = cookies.get('user_id');
	if (!userId) {
		redirect(307, '/');
	}

	const user: User | null = await getUserById(userId);
	let profileSurvey: SelectProfileSurvey | null = await getProfileSurvey(userId);
	if (!user) {
		cookies.delete('user_id', { path: '/' });
		redirect(307, '/');
	}

	// Kinda repeats logic from the load in /tests route
	// here we gonna use it to check if user has unfinished tests and disallow access to most of the pages
	const visibleTests = tests.filter((t) => !t.hidden);
	const testSessionCounts = await getTestSessionCounts(userId);

	const hasUnfinishedTests = Object.keys(testSessionCounts).length < visibleTests.length;
	const loggedInAdmin = cookies.get('logged_in_admin'); // logged in admins should be able to access all pages

	const undiagnosed = hasUnfinishedTests && !loggedInAdmin;

	// As user will be eventually redirected to /tests page to start diagnostic it's required to allow /tests.
	// As well it's probably a good idea to allow /profile so user can logout for example.
	const allowedPaths = ['/home', '/tests', '/profile', '/admin'];
	if (undiagnosed) {
		let allowed = false;
		for (const allowedPath of allowedPaths) {
			if (url.pathname.startsWith(allowedPath)) {
				allowed = true;
				break;
			}
		}

		if (!allowed) {
			redirect(307, '/');
		}
	}

	// Дефолтные значения для всех полей
	const getDefaultValues = () => ({
		// Tab 1
		birthCity: null,
		currentCityType: null,
		gtoId: null,
		email: null,

		// Tab 2
		education: null,
		yearsNotQualified: null,
		yearsQualifiedApplied: null,
		yearsQualifiedNonApplied: null,
		yearsProfessional: null,
		yearsHighResponsibility: null,

		// Tab 3
		currentOccupation: null,
		jobPosition: null,

		// Еженедельные активности
		weeklyReading: null,
		weeklyHousework: null,
		weeklyHobby: null,
		weeklyTech: null,

		// Ежемесячные активности
		monthlySocial: null,
		monthlyCulture: null,
		monthlyGardening: null,
		monthlyCaring: null,
		monthlyVolunteer: null,
		monthlyArtistic: null,

		// Ежегодные активности
		yearlyEvents: null,
		yearlyTravel: null,
		yearlyBookReading: null,

		// Tab 4
		height: null,
		weight: null,
		dominantHand: null,
		isAmbidextrous: null,
		chronicDiseases: null,
		smoking: null,
		alcohol: null,
		sports: null,
		isGamer: null
	});

	if (!profileSurvey) {
		profileSurvey = getDefaultValues();
	}

	console.log(profileSurvey);

	return {
		user,
		profileSurvey,
		undiagnosed,
		allowedPaths
	};
};
