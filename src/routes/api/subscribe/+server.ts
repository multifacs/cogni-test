// import { json } from '@sveltejs/kit';
// import { PUSH_API_URL } from '$env/static/private';

// export async function POST({ request }) {
// 	const subscription = await request.json();

// 	// Проксируем запрос на внешний API (твой отдельный сервер)
// 	const response = await fetch(PUSH_API_URL, {
// 		method: 'POST',
// 		headers: { 'Content-Type': 'application/json' },
// 		body: JSON.stringify(subscription)
// 	});

// 	if (!response.ok) {
// 		const text = await response.text();
// 		return json({ error: 'Ошибка при отправке подписки', text }, { status: 500 });
// 	}

// 	return json({ success: true });
// }
