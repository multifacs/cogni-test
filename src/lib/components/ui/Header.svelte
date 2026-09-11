<script lang="ts">
	import type { DevAction } from '$lib/types/header-action';

	let {
		text,
		action = null
	}: {
		text: string;
		action?: DevAction;
	} = $props();

	let pending = $state(false);

	// Await the caller's promise (no fire-and-forget wrapper): rejections
	// propagate and the pending flag always resets in finally.
	async function handleActionClick() {
		if (!action || pending) return;
		pending = true;
		try {
			await action.onclick();
		} finally {
			pending = false;
		}
	}
</script>

<div class="banner">
	<div class="flex items-center justify-between gap-4" class:w-full={action}>
		<img src="/logo.svg" alt="Icon" class="icon" />
		<h2
			class="text-center"
			style="font-weight: var(--font-weight-bold); --tw-font-weight: var(--font-weight-bold)"
		>
			{text}
		</h2>
		{#if action}
			<button
				type="button"
				class="dev-action"
				aria-label={action.label}
				onclick={handleActionClick}
				disabled={pending}
			>
				{#if pending}
					<span class="dev-action-spinner" aria-hidden="true"></span>
				{:else}
					<span aria-hidden="true">⚡</span>
				{/if}
				<span class="dev-action-label">{action.label}</span>
			</button>
		{/if}
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

	/* DEV-only action slot (right side of the banner). Compact on purpose:
	   the banner shares tight mobile breakpoints with the logo above. */
	.dev-action {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		flex-shrink: 0;
		padding: 0.375rem 0.75rem;
		border: none;
		border-radius: var(--radius-lg, 0.5rem);
		background-color: #4286f41b;
		color: inherit;
		font-size: 0.875rem;
		font-weight: 500;
		line-height: 1.25rem;
		cursor: pointer;
		transition: background-color 0.2s ease-in;
	}

	.dev-action:hover {
		background-color: #4286f438;
	}

	.dev-action:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.dev-action-spinner {
		width: 0.875rem;
		height: 0.875rem;
		flex-shrink: 0;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: dev-action-spin 0.8s linear infinite;
	}

	@keyframes dev-action-spin {
		to {
			transform: rotate(360deg);
		}
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

		.dev-action {
			padding: 0.375rem 0.5rem;
		}

		/* Long labels ("Автопрохождение") crowd the title on narrow
		   screens — fall back to the icon, aria-label keeps it accessible. */
		.dev-action-label {
			display: none;
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
