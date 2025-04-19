<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { userStore } from '$lib/stores/user.js';
	import Button from '$lib/components/ui/Button.svelte';

	let { data } = $props();

	let firstname = $state('');
	let lastname = $state('');
	let day = $state('01');
	let month = $state('01');
	let year = $state('2000');
	let sex = $state('male');

	let cataract = $state('no');
	let colorist = $state('no');
	let neuro = $state('no');

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

	function incrementDay() {
		let value = parseInt(day) || 0;
		const maxDays = getDaysInMonth(parseInt(month), parseInt(year));
		value = value < maxDays ? value + 1 : 1;
		day = value.toString().padStart(2, '0');
	}

	function decrementDay() {
		let value = parseInt(day) || 0;
		const maxDays = getDaysInMonth(parseInt(month), parseInt(year));
		value = value > 1 ? value - 1 : maxDays;
		day = value.toString().padStart(2, '0');
	}

	function incrementMonth() {
		let value = parseInt(month) || 0;
		value = value < 12 ? value + 1 : 1;
		month = value.toString().padStart(2, '0');
	}

	function decrementMonth() {
		let value = parseInt(month) || 0;
		value = value > 1 ? value - 1 : 12;
		month = value.toString().padStart(2, '0');
	}

	function incrementYear() {
		let value = parseInt(year) || 0;
		value = value < 1900 ? 2000 : value + 1;
		year = value.toString().padStart(4, '0');
	}

	function decrementYear() {
		let value = parseInt(year) || 0;
		value = value > 1900 ? value - 1 : 1900;
		year = value.toString().padStart(4, '0');
	}

	onMount(() => {
		userStore.set(data.user || '');
	});
</script>

<form
	class="
	login-container flex
	max-h-[85dvh]
	max-w-[350px]
	min-w-[300px]
	touch-none
	flex-col
	gap-1
	rounded-4xl
	bg-gray-700
	p-5
	shadow-md
	"
	method="POST"
	action="?/login"
	use:enhance
>
	<h1>Вход</h1>
	<div class="input-group">
		<label for="firstname">Имя:</label>
		<input
			type="text"
			id="firstname"
			name="firstname"
			placeholder="ИМЯ"
			bind:value={firstname}
			required
		/>
	</div>

	<div class="input-group">
		<label for="lastname">Первые две буквы фамилии:</label>
		<input
			type="text"
			id="lastname"
			name="lastname"
			placeholder="ФА"
			bind:value={lastname}
			maxlength="2"
			required
		/>
	</div>

	<div class="input-group">
		<label for="birthdate">Дата рождения:</label>
		<div class="date-inputs">
			<div class="date-controls">
				<button
					type="button"
					tabindex="-1"
					onpointerdown={() => startIncrement(incrementDay)}
					onpointerup={stopIncrement}
					onpointerleave={stopIncrement}
					class="up-btn">+</button
				>
				<input
					type="text"
					id="day"
					name="day"
					bind:value={day}
					maxlength="2"
					placeholder="ДД"
					required
				/>
				<button
					type="button"
					tabindex="-1"
					onpointerdown={() => startIncrement(decrementDay)}
					onpointerup={stopIncrement}
					onpointerleave={stopIncrement}
					class="down-btn">+</button
				>
			</div>
			<div class="date-controls">
				<button
					type="button"
					tabindex="-1"
					onpointerdown={() => startIncrement(incrementMonth)}
					onpointerup={stopIncrement}
					onpointerleave={stopIncrement}
					class="up-btn">+</button
				>
				<input
					type="text"
					id="month"
					name="month"
					bind:value={month}
					maxlength="2"
					placeholder="ММ"
					required
				/>
				<button
					type="button"
					tabindex="-1"
					onpointerdown={() => startIncrement(decrementMonth)}
					onpointerup={stopIncrement}
					onpointerleave={stopIncrement}
					class="down-btn">+</button
				>
			</div>
			<div class="date-controls">
				<button
					type="button"
					tabindex="-1"
					onpointerdown={() => startIncrement(incrementYear)}
					onpointerup={stopIncrement}
					onpointerleave={stopIncrement}
					class="up-btn">+</button
				>
				<input
					type="text"
					id="year"
					name="year"
					bind:value={year}
					maxlength="4"
					placeholder="ГГГГ"
					required
				/>
				<button
					type="button"
					tabindex="-1"
					onpointerdown={() => startIncrement(decrementYear)}
					onpointerup={stopIncrement}
					onpointerleave={stopIncrement}
					class="down-btn">+</button
				>
			</div>
		</div>
	</div>

	<div class="input-group">
		<label for="sex">Пол:</label>
		<div class="gender-group">
			<label>
				<input type="radio" name="sex" bind:group={sex} value="male" required /> Мужской
			</label>
			<label>
				<input type="radio" name="sex" bind:group={sex} value="female" /> Женский
			</label>
		</div>
	</div>

	<div class="input-group hidden">
		<label for="cataract">Есть ли у вас катаракта?</label>
		<div class="gender-group">
			<label>
				<input type="radio" name="cataract" bind:group={cataract} value="yes" required /> Да
			</label>
			<label>
				<input type="radio" name="cataract" bind:group={cataract} value="no" /> Нет
			</label>
		</div>
	</div>

	<div class="input-group hidden">
		<label for="colorist">Вы художник или фотограф?</label>
		<div class="gender-group">
			<label>
				<input type="radio" name="colorist" bind:group={colorist} value="yes" required /> Да
			</label>
			<label>
				<input type="radio" name="colorist" bind:group={colorist} value="no" /> Нет
			</label>
		</div>
	</div>

	<div class="input-group hidden">
		<label for="neuro">Есть ли у вас неврологические заболевания ?</label>
		<div class="gender-group">
			<label>
				<input type="radio" name="neuro" bind:group={neuro} value="yes" required /> Да
			</label>
			<label>
				<input type="radio" name="neuro" bind:group={neuro} value="no" /> Нет
			</label>
		</div>
	</div>

	<Button color="green" type="submit">Войти</Button>
</form>

<style>
	.input-group input[type='text'] {
		width: 100%;
		padding: 10px;
		border: 2px solid #ccc;
		border-radius: 5px;
		font-size: 16px;
		text-transform: uppercase;
		box-sizing: border-box;
	}

	.input-group input[type='text']:focus {
		border-color: #555;
	}

	.date-inputs {
		display: flex;
		gap: 5px;
	}

	.date-inputs input {
		width: 50px;
		text-align: center;
	}

	.date-controls {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 5px;
	}

	.date-controls button {
		border: none;
		font-size: 16px;
		cursor: pointer;
	}

	.gender-group {
		display: flex;
		gap: 10px;
	}

	.gender-group label {
		display: flex;
		align-items: center;
		gap: 5px;
	}

	button {
		color: var(--main-text-color);
		width: 20px;
	}

	.up-btn {
		background: url(/up-circle.svg);
		background-size: 16pt;
		background-repeat: no-repeat;
		color: transparent;
	}

	.down-btn {
		background: url(/down-circle.svg);
		background-size: 16pt;
		background-repeat: no-repeat;
		color: transparent;
	}
</style>
