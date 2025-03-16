import { redirect } from '@sveltejs/kit';

export function load({ cookies }) {
    const user = cookies.get('user');
    return {
        user
    };
}