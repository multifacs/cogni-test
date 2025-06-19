// import { MODE } from '$env/static/private';
import { TG_GROUP_LINK } from '$env/static/private';
import { getUserById } from '$lib/server/db';
import { tests } from '$lib/tests';

export async function load({ cookies }) {
	const userId = cookies.get('user');

	if (userId) {
		const userData = await getUserById(userId);
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
		user: userId,
		TG_GROUP_LINK,
		tests
	};
}
