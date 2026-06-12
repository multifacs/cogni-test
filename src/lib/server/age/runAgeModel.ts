export async function runAgeModel(features: Record<string, number>): Promise<number | null> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 100);

	try {
		const response = await fetch('http://194.58.126.199/APIpy/predict', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(features),
			signal: controller.signal
		});

		if (!response.ok) {
			console.error('❌ Ошибка HTTP от сервера предсказаний:', response.status);
			return null;
		}

		const data = await response.json();

		if (typeof data.age === 'number') {
			return data.age;
		} else {
			console.warn('⚠️ Некорректный ответ от API:', data);
			return null;
		}
	} catch (err) {
		if (err instanceof DOMException && err.name === 'AbortError') {
			console.error('⏱️ Таймаут при обращении к API предсказания возраста');
			return null;
		}
		console.error('🚨 Ошибка при обращении к API предсказания возраста:', err);
		return null;
	} finally {
		clearTimeout(timeout);
	}
}
