<script lang="ts">
	let { age, realAge } = $props();

	let trackerStatus = $derived(() => {
		if (age === null || age === undefined || realAge === null || realAge === undefined) {
			return 'unknown';
		}
		if (age < realAge) return 'better';
		if (age === realAge) return 'equal';
		return 'worse';
	});

	let statusText = $derived(() => {
		const status = trackerStatus();
		if (status === 'unknown') {
			return 'Пройдите тесты, чтобы узнать свой возраст';
		}
		if (status === 'better') {
			return `Поздравляем! Ваш когнитивный возраст моложе реального!`;
		}
		if (status === 'equal') {
			return 'Отлично! Ваш когнитивный возраст совпадает с реальным!';
		}
		return `Регулярные тренировки помогут улучшить результат`;
	});

	let trackerImage = $derived(() => {
		const status = trackerStatus();
		switch (status) {
			case 'better':
				return '/tracker/tracker_better.svg';
			case 'equal':
				return '/tracker/tracker_equal.svg'; // Желтый - равен
			case 'worse':
				return '/tracker/tracker_worse.svg'; // Красный - хуже (старше)
			default:
				return null;
		}
	});
</script>

<div class="card">
	<div>
		<h2>Ваш когнитивный возраст</h2>
		<div class="text">{age} лет</div>
	</div>

	<h3>{statusText()}</h3>
	<img src={trackerImage()} alt="Tracker" />
</div>

<style>
	.card {
		background-color: #fff;
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		padding: 2.5rem;
		gap: 1rem;
	}

	.text {
		font-size: var(--text-3xl);
		--tw-font-weight: var(--font-weight-black);
		font-weight: var(--font-weight-black);
		text-align: center;
		color: var(--main-text-color);
	}
</style>
