import { getUserById } from '$lib/server/db/user';
import { getLastResult } from '$lib/server/db/result';

export async function getFeaturesFromDB(userId: string) {
	console.log('➡️ getFeaturesFromDB: получаю признаки для пользователя', userId);

	const testMetrics: Record<string, any> = {};

	// 1. Кампиметрия
	const cam = await getLastResult('campimetry', userId);
	if (cam) {
		const times = cam.attempts.map((a) => a.time);
		const deltas = cam.attempts.map((a) => Math.abs(a.delta ?? 0));
		testMetrics.cam_aver_time = avg(times);
		testMetrics.cam_aver_abs_delta = avg(deltas);
	}

	// 2. Математика
	const math = await getLastResult('math', userId);
	if (math) {
		const times = math.attempts.map((a) => a.time);
		const corrects = math.attempts.map((a) => (a.isCorrect ? 1 : 0));
		testMetrics.math_aver_time = avg(times);
		testMetrics.math_part_correct = avg(corrects);
	}

	// 3. Память
	const mem = await getLastResult('memory', userId);
	if (mem) {
		const times = mem.attempts.map((a) => a.time);
		const corrects = mem.attempts.map((a) => (a.isCorrect ? 1 : 0));
		testMetrics.mem_aver_time = avg(times);
		testMetrics.mem_part_correct = avg(corrects);
	}

	// 4. Munkres
	const mun = await getLastResult('munsterberg', userId);
	if (mun) {
		const times = mun.attempts.map((a) => a.time);
		testMetrics.mun_aver_time = avg(times);
	}

	// 5. Stroop
	const str = await getLastResult('stroop', userId);
	if (str) {
		const times = str.attempts.map((a) => a.time);
		const corrects = str.attempts.map((a) => (a.isCorrect ? 1 : 0));
		testMetrics.str_aver_time = avg(times);
		testMetrics.str_part_correct = avg(corrects);
	}

	// 6. Switching
	const swa = await getLastResult('swallow', userId);
	if (swa) {
		const times = swa.attempts.map((a) => a.time);
		const corrects = swa.attempts.map((a) => (a.isCorrect ? 1 : 0));
		testMetrics.swa_aver_time = avg(times);
		testMetrics.swa_part_correct = avg(corrects);
	}

	// 7. Профиль
	const user = await getUserById(userId);
	if (user) {
		testMetrics.sex = user.sex === 'male' ? 1 : 0;
	}

	console.log('📊 Метрики для модели:', testMetrics);
	return testMetrics;
}

function avg(arr: number[]) {
	if (!arr || arr.length === 0) return null;
	return arr.reduce((a, b) => a + b, 0) / arr.length;
}
