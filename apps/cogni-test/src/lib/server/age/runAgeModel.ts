export async function runAgeModel(features: Record<string, number>): Promise<number | null> {
	try {
		const response = await fetch('http://194.58.126.199/APIpy/predict', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(features)
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
		console.error('🚨 Ошибка при обращении к API предсказания возраста:', err);
		return null;
	}
}
