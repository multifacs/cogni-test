export function translate(word: string): string {
	const dict = {
		red: 'Красный',
		cyan: 'Бирюзовый',
		green: 'Зеленый',
		magenta: 'Пурпурный',
		blue: 'Синий',
		yellow: 'Желтый',
		stage: 'Этап',
		'stage 1': 'Этап 1',
		'stage 2': 'Этап 2',
		'stage 3': 'Этап 3'
	};
	if (word && word in dict) return dict[word];
	if (word && !(word in dict)) return word;
	return '';
}

export function clamp(n: number, min: number, max: number) {
	return Math.min(Math.max(n, min), max);
}

export const delay = (delayInms: number) => {
	return new Promise((resolve) => setTimeout(resolve, delayInms));
};

export function shuffle(array: any[]) {
	let currentIndex = array.length;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {
		// Pick a remaining element...
		let randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}
}

export function getCSSVar(variable: string): string {
	return window.getComputedStyle(document.body).getPropertyValue(variable);
}
