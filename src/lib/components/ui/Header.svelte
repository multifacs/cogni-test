<script lang="ts">
	let { text } = $props();
</script>

<div class="banner">
	<div class="flex items-center justify-between gap-4">
		<img src="/logo.svg" alt="Icon" class="icon" />
		<div class="text">
			{text}
		</div>
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
	.text {
		color: var(--main-text-color);
		font-size: 1.4rem;
		--tw-font-weight: var(--font-weight-bold);
		font-weight: var(--font-weight-bold);
		text-align: center;
	}
</style>
