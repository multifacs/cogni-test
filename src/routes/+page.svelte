<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import { userStore } from '$lib/stores/user.js';

	let { data } = $props();

	let name = $state('');
	let surname = $state('');
	let day = $state('');
	let month = $state('');
	let year = $state('');
	let sex = $state('');

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

<form class="login-container" method="POST" action="?/login" use:enhance>
	<h1>Вход</h1>
	<p>Введите ваши данные</p>

	<div class="input-group">
		<label for="name">Имя:</label>
		<input type="text" id="name" name="name" placeholder="ИМЯ" bind:value={name} required />
	</div>

	<div class="input-group">
		<label for="surname">Первые две буквы фамилии:</label>
		<input
			type="text"
			id="surname"
			name="surname"
			placeholder="ФА"
			bind:value={surname}
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

	<button type="submit" class="submit-button">Войти</button>
</form>

<style>
	.login-container {
		background-color: #4c4c4c;
		padding: 20px;
		border-radius: 10px;
		box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
		width: 300px;
		margin: 0 auto;
	}

	h1 {
		text-align: center;
		margin-bottom: 20px;
	}

	.input-group {
		margin-bottom: 15px;
	}

	.input-group label {
		display: block;
		margin-bottom: 5px;
		font-weight: bold;
	}

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

	.submit-button {
		width: 100%;
		padding: 10px;
		background-color: #28a745;
		color: #fff;
		border: none;
		border-radius: 5px;
		font-size: 16px;
		cursor: pointer;
	}

	.submit-button:hover {
		background-color: #218838;
	}

	button {
		color: var(--main-text-color);
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
