<script lang="ts">
	let { name, title, path, img, testSessionCounts = {} } = $props();
</script>

<a href={path} class="card">
	<div class="line"></div>
	<div class="flex h-[80%] flex-col items-center justify-between p-[5%]">
		<h2
			class="text-center"
			style="font-weight: var(--font-weight-bold); --tw-font-weight: var(--font-weight-bold)"
		>
			{title}
		</h2>

		<img src={img} alt={name} class="img" />
		{#if testSessionCounts[name] && testSessionCounts[name] > 0}
			<h3 class="text-center">
				Пройдено: {testSessionCounts[name]}
			</h3>
		{:else}
			<h3 class="text-center">Не пройдено</h3>
		{/if}
	</div>
</a>

<style>
	.card {
		overflow: hidden;
		background: rgba(255, 255, 255, 0.72);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 1rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		width: 100%;
		aspect-ratio: 1;
		justify-content: space-between;
		padding-bottom: 2vw;
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.04),
			0 8px 24px rgba(0, 0, 0, 0.08),
			0 24px 64px rgba(30, 60, 114, 0.12);
	}

	@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.card {
			background: #ffffff;
		}
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
