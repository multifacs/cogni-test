<script lang="ts">
	let { age, realAge } = $props();
	let displayAge = $derived(age === null || age === undefined ? null : Math.round(age));

	let trackerStatus = $derived.by(() => {
		if (displayAge === null || realAge === null || realAge === undefined) {
			return 'unknown';
		}
		if (displayAge < realAge) return 'better';
		if (displayAge === realAge) return 'equal';
		return 'worse';
	});

	let statusText = $derived.by(() => {
		if (trackerStatus === 'unknown') {
			return 'Пройдите тесты, чтобы узнать свой возраст';
		}
		if (trackerStatus === 'better') {
			return `Поздравляем! Ваш когнитивный возраст моложе реального!`;
		}
		if (trackerStatus === 'equal') {
			return 'Отлично! Ваш когнитивный возраст совпадает с реальным!';
		}
		return `Регулярные тренировки помогут улучшить результат`;
	});

	let trackerImage = $derived.by(() => {
		switch (trackerStatus) {
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
		<p class="text-center text-base font-medium">Ваш когнитивный возраст</p>
		<p class="text-center text-3xl font-bold">{displayAge ?? '??'} лет</p>
	</div>

	<p class="text-center text-sm">{statusText}</p>
	{#if trackerImage}<img class="img" src={trackerImage} alt="Tracker" />{/if}
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
