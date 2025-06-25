// import { MODE } from '$env/static/private';
import { TG_GROUP_LINK } from '$env/static/private';
import { getUserById } from '$lib/server/db';
import { tests } from '$lib/tests';
import type { User } from '$lib/types/index.js';

export async function load({ cookies }) {
	const userId = cookies.get('user');
	let userData: User;
	if (userId) {
		userData = await getUserById(userId) as User;
		if (!userData['id']) {
			cookies.set('user', '', { path: '/' });
		}
	}
	
	// if (MODE == 'DEV') {
	//     user = getDevUser() as string;
	//     console.log(user);
	//     cookies.set('user', user, { path: '/' });
	// }
	return {
		user: userData,
		TG_GROUP_LINK,
		tests
	};
}
