import { json } from '@sveltejs/kit';
import { createUserAdmin } from '$lib/server/db/controllers/user-admins';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
	const { patientId, adminId } = await request.json();
	if (!adminId) {
		return json({ error: 'AdminId is required' }, { status: 400 });
	}

	if (!patientId) {
		return json({ error: 'UserId is required' }, { status: 400 });
	}

	try {
		await createUserAdmin(patientId, adminId);
	} catch (error) {
        console.error(error);
		return json({ error: 'Failed to create user admin' }, { status: 500 });
	}

	return json({ success: true });
};
