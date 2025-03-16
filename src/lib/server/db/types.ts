export type StroopRecord = {
  id: number;
  score: number;
};

export type User = {
  id: string | null;
  name: string;
  surname: string;
  birth: string;
  sex: 'male' | 'female';
};