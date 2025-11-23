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

export function getCSSVar(variable: string): string {
	return window.getComputedStyle(document.body).getPropertyValue(variable);
}
