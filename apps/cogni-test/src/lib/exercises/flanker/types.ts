export type FlankerResult = {
	correctAnswers: number;
	totalTrials: number;
	elapsedTime: number;
	timeLimit: boolean;
	avgRtCongruentMs: number;
	avgRtIncongruentMs: number;
	flankerEffectMs: number;
	errors: number;
};
