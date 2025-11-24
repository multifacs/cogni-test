import { getUserById } from '$lib/server/db/controllers/user';
import { getLastResult } from '$lib/server/db/controllers/result';

export async function getFeaturesFromDB(userId: string) {
	console.log('➡️ getFeaturesFromDB: получаю признаки для пользователя', userId);

	const testMetrics: Record<string, any> = {};

	// 4. Munkres
	const mun = await getLastResult('munsterberg', userId);
	if (mun?.attempts?.length) {
		const times = mun.attempts.map((a: any) => a.time as number / 1000);
		testMetrics.munster_mean_attempt_time = avg(times);
	}

	// 5. Stroop
	const str = await getLastResult('stroop', userId);
	if (str?.attempts?.length) {
		const times = str.attempts.map((a: any) => a.time as number / 1000);
		testMetrics.stroop_var_attempt_time = variance(times);
	}

	// 6. Switching
	const swa = await getLastResult('swallow', userId);
	if (swa?.attempts?.length) {
		const red = swa.attempts.filter((a: any) => a.background === 'red'); // <-- из JSON
		if (red.length) {
			const times = red.map((a: any) => a.time as number / 1000);
			testMetrics.swallow_time_red = avg(times);
		}
	}

	console.log('📊 Метрики для модели:', testMetrics);
	return testMetrics;
}

function avg(arr: number[]) {
	if (!arr || arr.length === 0) return null;
	return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function variance(arr: number[]) {
	if (!arr || arr.length < 2) return 0;
	const m = avg(arr);
	return arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length;
}