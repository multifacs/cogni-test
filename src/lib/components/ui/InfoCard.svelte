<script lang="ts">
	let { title, info } = $props();

	const empty = $derived(info === null || info === undefined || info === '');
</script>

<div class="card">
	<div class="line"></div>
	<div class="flex h-full w-full flex-1 flex-col items-center justify-start gap-2 p-4 md:p-5">
		<p class="text-center text-base font-medium">{title}</p>
		<p class="text-center text-2xl font-bold">{empty ? '—' : info}</p>
	</div>
</div>

<style>
	.card {
		overflow: hidden;
		background-color: #fff;
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		min-height: 7.5rem;
		justify-content: flex-start;
		flex-shrink: 0;
	}

	.line {
		background-color: var(--main-accent-color);
		height: 1.25rem;
		width: 100%;
	}
</style>
