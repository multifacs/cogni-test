import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';

function safeRedirectTarget(raw: string | null): string {
	// принимаем только локальные пути, иначе на главную
	if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
	return '/';
}

export const load: PageServerLoad = (event) => {
	const target = safeRedirectTarget(event.url.searchParams.get('redirectTo'));
	if (event.locals.user) {
		throw redirect(302, target);
	}
	return { redirectTo: target };
};

export const actions: Actions = {
	signIn: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const target = safeRedirectTarget(event.url.searchParams.get('redirectTo'));

		if (!email || !password) {
			return fail(400, { mode: 'signIn', email, message: 'Введите email и пароль' });
		}

		try {
			await auth.api.signInEmail({
				body: { email, password },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					mode: 'signIn',
					email,
					message: error.message || 'Не удалось войти'
				});
			}
			console.error('[signIn] unexpected error:', error);
			const detail = error instanceof Error ? error.message : String(error);
			return fail(500, {
				mode: 'signIn',
				email,
				message: `Непредвиденная ошибка: ${detail}`
			});
		}

		throw redirect(302, target);
	},

	signUp: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString().trim() ?? '';
		const target = safeRedirectTarget(event.url.searchParams.get('redirectTo'));

		if (!email || !password || !name) {
			return fail(400, {
				mode: 'signUp',
				email,
				name,
				message: 'Заполните имя, email и пароль'
			});
		}

		if (password.length < 8) {
			return fail(400, {
				mode: 'signUp',
				email,
				name,
				message: 'Пароль должен быть не короче 8 символов'
			});
		}

		try {
			await auth.api.signUpEmail({
				body: { email, password, name },
				headers: event.request.headers
			});
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, {
					mode: 'signUp',
					email,
					name,
					message: error.message || 'Не удалось зарегистрироваться'
				});
			}
			console.error('[signUp] unexpected error:', error);
			const detail = error instanceof Error ? error.message : String(error);
			return fail(500, {
				mode: 'signUp',
				email,
				name,
				message: `Непредвиденная ошибка: ${detail}`
			});
		}

		throw redirect(302, target);
	}
};
