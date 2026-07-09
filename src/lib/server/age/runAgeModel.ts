export async function runAgeModelLegacy(
	features: Record<string, number>
): Promise<number | null> {
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

import { InferenceSession, Tensor } from 'onnxruntime-node';
import baggingBase64 from 'virtual:inline-onnx/./models/Bagging_age_predictor.onnx';

let baggingSession: InferenceSession | null = null;

async function getBaggingSession(): Promise<InferenceSession> {
	if (!baggingSession) {
		const buffer = Buffer.from(baggingBase64, 'base64');
		baggingSession = await InferenceSession.create(buffer);
	}
	return baggingSession;
}

export async function runAgeModel(features: Record<string, number>): Promise<number | null> {
	try {
		const session = await getBaggingSession();

		const feeds: Record<string, Tensor> = {};
		for (const [name, value] of Object.entries(features)) {
			feeds[name] = new Tensor('float32', Float32Array.from([value]), [1, 1]);
		}

		const start = performance.now();
		const result = await session.run(feeds);
		console.log(`⏱️ ONNX inference: ${(performance.now() - start).toFixed(1)}ms`);
		const age = result.variable.data[0] as number;

		if (Number.isFinite(age)) {
			return Math.round(age * 10) / 10;
		}

		console.warn('⚠️ ONNX model returned non-finite age:', age);
		return null;
	} catch (err) {
		console.error('🚨 ONNX inference error:', err);
		return null;
	}
}
