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
		birthCity: '',
		currentCityType: 'capital',
		// currentCityType: 'city',

		// Tab 2
		education: 'none',
		yearsNotQualified: 0,
		yearsQualifiedApplied: 0,
		yearsQualifiedNonApplied: 0,
		yearsProfessional: 0,
		yearsHighResponsibility: 0,

		// Tab 3
		currentOccupation: 'employed',
		jobPosition: 'office_employee',

		// Еженедельные активности
		weeklyReading: 'never',
		weeklyHousework: 'never',
		weeklyHobby: 'never',
		weeklyTech: 'never',

		// Ежемесячные активности
		monthlySocial: 'never',
		monthlyCulture: 'never',
		monthlyGardening: 'never',
		monthlyCaring: 'never',
		monthlyVolunteer: 'never',
		monthlyArtistic: 'never',

		// Ежегодные активности
		yearlyEvents: 'never',
		yearlyTravel: 'never',
		yearlyBookReading: 'never',

		// Tab 4
		height: 170,
		weight: 70,
		dominantHand: 'right',
		isAmbidextrous: 0,
		chronicDiseases: '',
		smoking: 'no',
		alcohol: 'no',
		sports: '',
		isGamer: 0
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
