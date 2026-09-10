<script lang="ts">
	let { text } = $props();
</script>

<div class="banner">
	<div class="flex items-center justify-between gap-4">
		<img src="/logo.svg" alt="Icon" class="icon" />
		<h2
			class="text-center"
			style="font-weight: var(--font-weight-bold); --tw-font-weight: var(--font-weight-bold)"
		>
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

	.banner .icon {
		width: 50px;
		height: 50px;
		flex-shrink: 0;
	}

	/* Small phones: shrink the banner so screens like 320x433 keep
	   as much room as possible for the content below. */
	@media (max-width: 640px) {
		.banner {
			padding: 0.5rem;
		}

		.banner .icon {
			width: 36px;
			height: 36px;
		}
	}

	@media (max-width: 360px) {
		.banner {
			padding: 0.375rem;
		}

		.banner .icon {
			width: 30px;
			height: 30px;
		}
	}
</style>
