<script lang="ts">
	import { onMount } from 'svelte';
	import { slide } from 'svelte/transition';
	let { data } = $props();

	let isTestRunning = $state(false);
	let isHome = $state(true);
	let image = $state(Object());

	onMount(async () => {});

	let bgColor = new labColor();
	let figureColor = new labColor();

	async function startTest() {
		isTestRunning = true;
		isHome = false;
		bgColor.shuffle();
		figureColor.setValues(bgColor);
	}

	function clamp(n: number, min: number, max: number) {
		return Math.min(Math.max(n, min), max);
	}

	const delay = (delayInms: number) => {
		return new Promise((resolve) => setTimeout(resolve, delayInms));
	};
</script>

<h1>Компьютерная кампиметрия</h1>

{#if isHome}
	<p class="text">
		<b>Первый этап.</b> На экране отображен фон и чей-то силуэт одного и того же цвета. Необходимо нажимать
		на кнопку «Добавить оттенок», чтобы прибавлять оттенок силуэту. Когда фигурка становится распознаваемой,
		нужно нажать на верный силуэт из предложенных.
	</p>
	<p class="text">
		<b>Второй этап.</b> На экране все тот же фон и тот же силуэт, но уже отклонение от цвета фона определено
		не нажатиями на кнопку «Добавить оттенок», а от программно заданного числа шагов.
	</p>
{:else}
	<div class="subcontainer" transition:slide={{ duration: 500 }}>
		<div class="background" style={`background-color: ${bgColor.toString()}`}>
			<div
				style={`
				background-color: ${figureColor.toString()};
				mask-image: url(${'../campimetry/swallow.svg'});
				-webkit-mask-image: url(${'../campimetry/swallow.svg'});
				`}
			></div>
		</div>
		<button
			class="inc-button"
			onclick={() => {
				figureColor.incA();
			}}>Прибавить оттенок</button
		>
	</div>
{/if}
<div class="button-container">
	<button class="start-button" onclick={startTest}
		>{isTestRunning ? 'Перезапустить тест' : 'Начать тест'}</button
	>
	{#if isTestRunning}
		<button
			class="start-button back-button"
			onclick={() => {
				isTestRunning = false;
				isHome = true;
			}}>Стоп</button
		>
	{:else}
		<a class="back-button" href="/tests">Назад</a>
	{/if}
</div>

<style>
	h1 {
		margin: 0;
	}
	@media (max-width: 440px) {
		h1 {
			font-size: larger;
		}
	}

	.background {
		display: flex;
		justify-content: center;
		align-items: center;
		width: 300px;
		height: 300px;
		/* background-color: #553131; */
	}

	.background div {
		width: 100px;
		height: 100px;
	}
	.button-container {
		display: flex;
		gap: 10px;
		margin-top: 20px;
	}
	.start-button,
	.back-button {
		padding: 10px 20px;
		font-size: 16px;
		cursor: pointer;
	}
	.text {
		text-align: justify;
		margin: 10px 20px;
	}

	.subcontainer {
		display: flex;
		flex-direction: column;
		justify-content: center; /* Центрирование по горизонтали */
		align-items: center; /* Центрирование по вертикали */
		gap: 20px;
	}

	.button-container {
		display: flex;
		gap: 10px; /* Расстояние между кнопками */
		justify-content: center; /* Выравнивание по центру */
		align-items: center; /* Выравнивание по вертикали */
	}

	.inc-button {
		background-color: rgb(39, 203, 211); /* Зеленый цвет */
		color: white; /* Белый текст */
		border: none;
		padding: 10px 20px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.start-button {
		background-color: green; /* Зеленый цвет */
		color: white; /* Белый текст */
		border: none;
		padding: 10px 20px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.start-button:hover {
		background-color: darkgreen; /* Темно-зеленый при наведении */
	}

	.back-button {
		background-color: #bf3023; /* Красный цвет */
		color: white; /* Белый текст */
		text-decoration: none; /* Убираем подчеркивание */
		padding: 10px 20px;
		border-radius: 5px;
		cursor: pointer;
		font-size: 16px;
		transition: background-color 0.3s ease;
	}

	.back-button:hover {
		background-color: darkred; /* Темно-красный при наведении */
	}
</style>
