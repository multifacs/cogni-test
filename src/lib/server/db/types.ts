export type StroopRecord = {
	id: number;
	score: number;
};

export type User = {
	id: string | null;
	firstname: string;
	lastname: string;
	birthdate: string;
	sex: 'male' | 'female';
	cataract: boolean | null;
	colorist: boolean | null;
	neuro: boolean | null;
};
