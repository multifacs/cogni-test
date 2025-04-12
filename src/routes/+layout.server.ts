// import { MODE } from '$env/static/private';

export function load({ cookies }) {
	const user = cookies.get('user');
	// if (MODE == 'DEV') {
	//     user = getDevUser() as string;
	//     console.log(user);
	//     cookies.set('user', user, { path: '/' });
	// }
	return {
		user
	};
}
