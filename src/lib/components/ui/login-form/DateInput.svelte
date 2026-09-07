<script lang="ts">
	import { SvelteDate } from 'svelte/reactivity';

	import { INPUT_CLASS } from './inputStyles';

	let {
		id = undefined,
		name,
		value = $bindable(),
		required,
		errorMessage = $bindable()
	} = $props();

	const inputId = $derived(id ?? name);

	// Держим последний текст ошибки, пока слот сворачивается,
	// иначе контент исчезает раньше анимации и закрытие становится мгновенным
	let lastError = $state('');
	$effect(() => {
		if (errorMessage) lastError = errorMessage;
	});

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

	function handleBlur() {
		validateDate(value);
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
		const today = new SvelteDate();
		today.setHours(0, 0, 0, 0); // Сбрасываем время для точного сравнения

		if (inputDate > today) {
			errorMessage = 'Дата не может быть больше текущей';
			return false;
		}

		errorMessage = '';
		return true;
	}
</script>

<input
	id={inputId}
	{required}
	{name}
	type="text"
	inputmode="numeric"
	bind:value
	placeholder="ДД.ММ.ГГГГ"
	oninput={handleInput}
	onkeydown={handleKeyDown}
	onblur={handleBlur}
	maxlength="10"
	aria-invalid={errorMessage ? 'true' : undefined}
	aria-describedby={errorMessage ? `${inputId}-error` : undefined}
	class={`${INPUT_CLASS} ${errorMessage ? 'border-[var(--error-color)]' : 'border-gray-600'}`}
/>
<div class="err-collapse" class:open={!!errorMessage}>
	<div>
		<p
			id={errorMessage ? `${inputId}-error` : undefined}
			class="pt-1 text-sm text-[var(--error-color)]"
			aria-live="polite"
		>
			{errorMessage || lastError}
		</p>
	</div>
</div>

<style>
	.err-collapse {
		display: grid;
		grid-template-rows: 0fr;
		transition: grid-template-rows 0.25s ease;
	}
	.err-collapse.open {
		grid-template-rows: 1fr;
	}
	.err-collapse > div {
		overflow: hidden;
	}
	@media (prefers-reduced-motion: reduce) {
		.err-collapse {
			transition: none;
		}
	}
</style>
