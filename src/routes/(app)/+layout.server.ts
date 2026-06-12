import { getUserById } from '$lib/server/db';
import type { User } from '$lib/types/index.js';
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { SelectProfileSurvey } from '$lib/server/db/schema';
import { getProfileSurvey } from '$lib/server/db/controllers/survey';

export const load: LayoutServerLoad = async ({ cookies }) => {
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

	// Дефолтные значения для всех полей
	const getDefaultValues = () => ({
		// Tab 1
		birthCity: null,
		currentCityType: null,

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
		profileSurvey
	};
};
