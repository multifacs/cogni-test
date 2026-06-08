import type { AttemptSubmitPayload, AttemptCreatedResponse } from '$lib/stats/contracts';


//функция, которой пользуются все тесты, когда хотят сохранить результаты в БД.
export async function submitAttempt(payload: AttemptSubmitPayload): Promise<string | null> {
	try {
		const response = await fetch('/api/attempts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload),
			credentials: 'include'
		});

		if (!response.ok) {
			console.error('[submitAttempt] failed:', response.status, await response.text());
			return null;
		}

		const data = (await response.json()) as AttemptCreatedResponse;
		return data.attemptId;
	} catch (err) {
		console.error('[submitAttempt] network error:', err);
		return null;
	}
}
