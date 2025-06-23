import { redirect } from '@sveltejs/kit';
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, PUSH_API_URL } from '$env/static/private';

export async function load({ cookies }) {
	const user = cookies.get('user');
	if (!user) {
		redirect(307, '/');
	}

	return {
		VAPID_PUBLIC_KEY,
		VAPID_PRIVATE_KEY,
		PUSH_API_URL
	};
}
