import { redirect } from '@sveltejs/kit';
import localforage from 'localforage';

export const load = async () => {
  return;
};

export const actions = {
	login: async ({ request }) => {
		const formData = await request.formData();

		const password = 'ARST';

		if (password === formData.get('password')) {
			redirect(307, '/about');
		}
	}
};
