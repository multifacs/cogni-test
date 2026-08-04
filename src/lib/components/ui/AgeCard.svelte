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
				return '/tracker/tracker_equal.svg';
			case 'worse':
				return '/tracker/tracker_worse.svg';
			default:
				return null;
		}
	});
</script>

<div class="card">
	<div>
		<h2 style="font-weight: var(--font-weight-bold);">Ваш когнитивный возраст</h2>
		<h1>{age} лет</h1>
	</div>

	<h4>{statusText()}</h4>
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
</style>
