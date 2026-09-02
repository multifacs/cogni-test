<script lang="ts">
	import { exerciseRegistry } from '$lib/exercises';

	let { name, title, path, img, testSessionCounts = {} } = $props();
</script>

<a href={path} class="card">
	<div class="line"></div>
	<div class="flex h-[80%] flex-col items-center justify-between p-[5%]">
		<h2 style="font-weight: var(--font-weight-bold); --tw-font-weight: var(--font-weight-bold)">
			{title}
		</h2>

		<img src={img} alt={name} class="img" />
		{#if testSessionCounts[name] && testSessionCounts[name] > 0}
			<h3>
				Пройдено: {testSessionCounts[name]}
			</h3>
		{:else}
			<h3>Не пройдено</h3>
		{/if}
	</div>
</a>

<style>
	.card {
		overflow: hidden;
		background-color: #fff;
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: clamp(5rem, 40.5vw, 15rem);
		height: clamp(5rem, 40.5vw, 15rem);
		justify-content: space-between;
		padding-bottom: 2vw;
	}

	.img {
		width: 35%;
	}

	.line {
		background-color: var(--main-accent-color);
		height: clamp(1rem, 3.5vw, 2rem);
		width: 100%;
	}
</style>
