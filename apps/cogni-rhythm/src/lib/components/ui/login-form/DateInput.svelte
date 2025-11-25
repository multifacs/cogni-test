<script lang="ts">
	let { name, value = $bindable(), required, errorMessage = $bindable() } = $props();

	function handleInput(e: Event) {
		const input = e.target as HTMLInputElement;
		let val = input.value.replace(/[^0-9]/g, '');

		// Форматируем ввод
		let formatted = '';
		if (val.length > 0) {
			formatted = val.substring(0, 2);
			if (val.length > 1) {
				formatted += '.' + val.substring(2, 4);
				if (val.length > 3) {
					formatted += '.' + val.substring(4, 8);
				}
			}
		}

		// Ограничиваем длину
		if (val.length > 8) {
			val = val.substring(0, 8);
			formatted = formatted.substring(0, 10);
		}

		input.value = formatted;
		value = formatted;
		errorMessage = '';

		// Проверяем валидность только когда дата полностью введена
		validateDate(formatted);
		console.log(val);
	}

	function handleKeyDown(e: KeyboardEvent) {
		const input = e.target as HTMLInputElement;
		const cursorPos = input.selectionStart || 0;

		if (e.key === 'Backspace') {
			// Если курсор стоит после точки (позиции 3 или 6)
			if ([3, 6].includes(cursorPos)) {
				e.preventDefault();
				const val = input.value;

				// Удаляем цифру и точку перед курсором
				input.value = val.substring(0, cursorPos - 2) + val.substring(cursorPos);

				// Перемещаем курсор после предыдущего символа (не перед ним)
				input.setSelectionRange(cursorPos - 2, cursorPos - 2);
				value = input.value;
				errorMessage = '';
			}
		}
	}

	function validateDate(dateStr: string) {
		if (dateStr.length < 10) {
			errorMessage = 'Нужно ввести поле полностью';
			return false;
		}

		const parts = dateStr.split('.');
		if (parts.length !== 3 || parts.some((part) => !part)) {
			errorMessage = 'Некорректный формат даты';
			return false;
		}

		const day = parseInt(parts[0], 10);
		const month = parseInt(parts[1], 10);
		const year = parseInt(parts[2], 10);

		// Проверка года (1900 - текущий год)
		const currentYear = new Date().getFullYear();
		if (year < 1900 || year > currentYear) {
			errorMessage = `Год должен быть между 1900 и ${currentYear}`;
			return false;
		}

		// Проверка месяца
		if (month < 1 || month > 12) {
			errorMessage = 'Месяц должен быть от 1 до 12';
			return false;
		}

		// Проверка дня
		const daysInMonth = new Date(year, month, 0).getDate();
		if (day < 1 || day > daysInMonth) {
			errorMessage = `В этом месяце должно быть от 1 до ${daysInMonth} дней`;
			return false;
		}

		// Проверка что дата не больше текущей
		const inputDate = new Date(year, month - 1, day);
		const today = new Date();
		today.setHours(0, 0, 0, 0); // Сбрасываем время для точного сравнения

		if (inputDate > today) {
			errorMessage = 'Дата не может быть больше текущей';
			return false;
		}

		console.log(errorMessage);
		return true;
	}
</script>

<input
	{required}
	{name}
	type="text"
	inputmode="numeric"
	bind:value
	placeholder="ДД.ММ.ГГГГ"
	oninput={handleInput}
	onkeydown={handleKeyDown}
	maxlength="10"
	class={`
	max-xs:text-base
	max-xs:p-1
	xs:p-2.5
	block
	w-full
    rounded-lg
	border
	bg-gray-800
    text-white
    placeholder-gray-400
    outline-0
    transition
	focus:border-blue-500
    focus:ring-blue-500
	${errorMessage ? 'border-red-500' : 'border-gray-600'}
  `}
/>
