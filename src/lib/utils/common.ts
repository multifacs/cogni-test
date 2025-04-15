export function translate(word: string): string {
	const dict: Record<string, string> = {
		red: 'Красный',
		cyan: 'Бирюзовый',
		green: 'Зеленый',
		magenta: 'Пурпурный',
		blue: 'Синий',
		yellow: 'Желтый',
		stage: 'Этап',
		'stage 0': 'Попытки',
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

export function shuffle<T>(array: Array<T>) {
	let currentIndex = array.length;

	// While there remain elements to shuffle...
	while (currentIndex != 0) {
		// Pick a remaining element...
		const randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
	}
}

export function getCSSVar(variable: string): string {
	return window.getComputedStyle(document.body).getPropertyValue(variable);
}

/**
 * Форматирует дату в формате "дд-мм-гггг чч:мм" (локальное время пользователя).
 * @param dateString - Дата в формате "2025-04-15 07:46:18.974 +00:00" или аналогичном.
 * @returns Строка в формате "15-04-2025 12:00" (в локальном часовом поясе).
 */
export function formatUserLocalDate(dateString: string): string {
	const date = new Date(dateString);

	if (isNaN(date.getTime())) {
		throw new Error('Invalid date format');
	}

	// Получаем локальные день, месяц, год, часы и минуты
	const day = String(date.getDate()).padStart(2, '0');
	const month = String(date.getMonth() + 1).padStart(2, '0'); // Месяцы 0-11
	const year = date.getFullYear();
	const hours = String(date.getHours()).padStart(2, '0');
	const minutes = String(date.getMinutes()).padStart(2, '0');

	return `${day}.${month}.${year} ${hours}:${minutes}`;
}
