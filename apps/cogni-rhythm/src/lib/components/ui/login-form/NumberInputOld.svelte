<script lang="ts">
	let { type } = $props();

	let placeholder = $state('ДД');
	let maxlength = $state(2);

	let day = $state('01');
	let month = $state('01');
	let year = $state('2000');

	let value = $state(type == 'year' ? '2000' : '01');

	const incrementDay = (day: string): string => {
		let value = parseInt(day) || 0;
		const maxDays = getDaysInMonth(parseInt(month), parseInt(year));
		value = value < maxDays ? value + 1 : 1;
		return value.toString().padStart(2, '0');
	};

	const decrementDay = (day: string): string => {
		let value = parseInt(day) || 0;
		const maxDays = getDaysInMonth(parseInt(month), parseInt(year));
		value = value > 1 ? value - 1 : maxDays;
		return value.toString().padStart(2, '0');
	};

	const incrementMonth = (month: string): string => {
		let value = parseInt(month) || 0;
		value = value < 12 ? value + 1 : 1;
		return value.toString().padStart(2, '0');
	};

	const decrementMonth = (month: string): string => {
		let value = parseInt(month) || 0;
		value = value > 1 ? value - 1 : 12;
		return value.toString().padStart(2, '0');
	};

	const incrementYear = (year: string): string => {
		let value = parseInt(year) || 0;
		value = value < 1900 ? 2000 : value + 1;
		return value.toString().padStart(4, '0');
	};

	const decrementYear = (month: string): string => {
		let value = parseInt(year) || 0;
		value = value > 1900 ? value - 1 : 1900;
		return value.toString().padStart(4, '0');
	};

	let increment = () => {};
	let decrement = () => {};

	switch (type) {
		case 'day': {
			placeholder = 'ДД';
			increment = () => {
				value = incrementDay(value);
			};
			decrement = () => {
				value = decrementDay(value);
			};
			break;
		}
		case 'month': {
			placeholder = 'ММ';
			maxlength = 2;
			increment = () => {
				value = incrementMonth(value);
			};
			decrement = () => {
				value = decrementMonth(value);
			};
			break;
		}
		case 'year': {
			placeholder = 'ГГГГ';
			maxlength = 4;
			increment = () => {
				value = incrementYear(value);
			};
			decrement = () => {
				value = decrementYear(value);
			};
			break;
		}
	}

	let intervalId: ReturnType<typeof setInterval>;
	let timeoutId: ReturnType<typeof setTimeout>;

	type StepFunction = () => void;
	function startIncrement(stepFunction: StepFunction) {
		stepFunction(); // Выполняем сразу один шаг

		timeoutId = setTimeout(() => {
			intervalId = setInterval(stepFunction, 50); // Начинаем интервал через 500 мс
		}, 300); // Задержка перед началом интервала
	}

	function stopIncrement() {
		clearTimeout(timeoutId); // Очищаем таймер задержки
		clearInterval(intervalId); // Останавливаем интервал
	}

	function getDaysInMonth(month: number, year: number) {
		if (isNaN(month) || isNaN(year)) {
			return 31; // Если месяц не выбран, возвращаем максимальное количество дней
		}
		// Учитываем високосные годы для февраля
		if (month === 2) {
			return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 29 : 28;
		}
		// Месяцы с 30 днями
		if ([4, 6, 9, 11].includes(month)) {
			return 30;
		}
		// Остальные месяцы имеют 31 день
		return 31;
	}
</script>

<div class="flex flex-col items-center justify-center">
	<button
		type="button"
		tabindex="-1"
		onpointerdown={() => startIncrement(increment)}
		onpointerup={stopIncrement}
		onpointerleave={stopIncrement}
		class="w-[20px] cursor-pointer touch-none bg-[url(/up-circle.svg)] bg-size-[16pt] bg-no-repeat text-transparent select-none"
		>+</button
	>
	<input
		class="w-[3rem] text-center"
		type="number"
		name={type}
		bind:value
		{maxlength}
		{placeholder}
		required
	/>
	<button
		type="button"
		tabindex="-1"
		onpointerdown={() => startIncrement(decrement)}
		onpointerup={stopIncrement}
		onpointerleave={stopIncrement}
		class="w-[20px] cursor-pointer touch-none bg-[url(/down-circle.svg)] bg-size-[16pt] bg-no-repeat text-transparent select-none"
		>+</button
	>
</div>

<style>
</style>
