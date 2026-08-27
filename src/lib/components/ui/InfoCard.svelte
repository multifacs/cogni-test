<script lang="ts">
	let { title, info } = $props();
</script>

<div class="card">
	<div class="line"></div>
	<div class="flex h-[80%] flex-col items-center justify-start p-[5%] gap-2">
		<h2 >
			{title}
		</h2>
		<h1 style="font-weight: var(--font-weight-bold); --tw-font-weight: var(--font-weight-bold)">
			{info}
		</h1>
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
		width: clamp(5rem, 40.5vw, 15rem);
		height: clamp(5rem, 40.5vw, 15rem);
		justify-content: space-between;
		padding-bottom: 2vw;
		flex-shrink: 0;
	}

	.line {
		background-color: var(--main-accent-color);
		height: clamp(1rem, 3.5vw, 2rem);
		width: 100%;
	}
</style>
