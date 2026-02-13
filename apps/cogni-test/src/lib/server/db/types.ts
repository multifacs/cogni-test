export type StroopRecord = {
	id: number;
	score: number;
};

export type User = {
	id: string;
	firstname: string;
	lastname: string;
	birthday: Date;
	sex: 'male' | 'female';
};
