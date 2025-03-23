import { redirect } from '@sveltejs/kit';
import { Users } from '$lib/server/db';
import { MODE } from '$env/static/private';

export function load({ cookies }) {
    let user = cookies.get('user');
    if (MODE == 'DEV') {
        user = Users.getDevUser() as string;
        console.log(user);
        cookies.set('user', user, { path: '/' });
    }
    return {
        user
    };
}