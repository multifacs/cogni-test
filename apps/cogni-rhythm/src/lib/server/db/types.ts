export type StroopRecord = {
	id: number;
	score: number;
};

export type User = {
	id: string | null;
	firstname: string;
	lastname: string;
	birthday: Date;
	sex: 'male' | 'female';
};
