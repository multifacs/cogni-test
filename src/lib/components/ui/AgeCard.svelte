<script lang="ts">
	let { age, realAge } = $props();
	let displayAge = $derived(age === null || age === undefined ? null : Math.round(age));

	let trackerStatus = $derived(() => {
		if (displayAge === null || realAge === null || realAge === undefined) {
			return 'unknown';
		}
		if (displayAge < realAge) return 'better';
		if (displayAge === realAge) return 'equal';
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
		<h1>{displayAge ?? '??'} лет</h1>
	</div>

	<h4>{statusText()}</h4>
	{#if trackerImage()}<img class="img" src={trackerImage()} alt="Tracker" />{/if}
</div>

<style>
	.card {
		background-color: #fff;
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 2.5rem;
		gap: 1rem;

		/* width: min(90%, 30rem); */
	}

	.img {
		width: 60%;
	}
</style>
