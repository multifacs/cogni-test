<script lang="ts">
	let { text } = $props();
</script>

<div class="banner">
	<div class="flex items-center justify-between gap-4">
		<img src="/logo.svg" alt="Icon" class="icon" />
		<h2 style="font-weight: var(--font-weight-bold); --tw-font-weight: var(--font-weight-bold)">
			{text}
		</h2>
	</div>
</div>

<style>
	.banner {
		grid-area: banner;
		background-color: #fff;
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: center;

		min-height: 20px;
		max-height: 70px;
		flex-shrink: 0;
	}
</style>
