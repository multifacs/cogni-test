<script lang="ts">
	import { resolve } from '$app/paths';
	import type { PathnameWithSearchOrHash, ResolvedPathname } from '$app/types';

	// resolve() has a variadic conditional signature (ResolveArgs<T>) that
	// cannot accept the full route union — narrow it to the pathname overload
	// (same approach as Button.svelte).
	const resolvePathname = resolve as (path: PathnameWithSearchOrHash) => ResolvedPathname;

	let {
		title,
		text,
		goto,
		icon,
		variant = 'row',
		button_text = 'Читать'
	}: {
		title: string;
		text: string;
		goto: string;
		icon: string;
		variant?: 'row' | 'card';
		button_text?: string;
	} = $props();

	const href = $derived(resolvePathname(goto as PathnameWithSearchOrHash));
</script>

{#if variant === 'row'}
	<a class="row" {href}>
		<img class="row-icon" src={icon} alt="" />
		<span class="row-body">
			<h2 class="row-title">{title}</h2>
			<span class="row-text">{text}</span>
		</span>
		<svg
			class="chevron"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			aria-hidden="true"
		>
			<path d="m9 18 6-6-6-6" />
		</svg>
	</a>
{:else}
	<a class="card" {href}>
		<div class="card-top">
			<img class="card-icon" src={icon} alt="" />
			<h2 class="card-title">{title}</h2>
		</div>
		<p class="card-text">{text}</p>
		<span class="card-foot">
			<span class="card-link">
				{button_text}
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
					aria-hidden="true"
				>
					<path d="M5 12h14" />
					<path d="m12 5 7 7-7 7" />
				</svg>
			</span>
		</span>
	</a>
{/if}

<style>
	a.row,
	a.card {
		color: inherit;
		text-decoration: none;
		background: rgba(255, 255, 255, 0.72);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border-radius: 1rem;
		box-shadow:
			0 1px 2px rgba(0, 0, 0, 0.04),
			0 8px 24px rgba(0, 0, 0, 0.08);
		transition:
			box-shadow 0.2s ease,
			transform 0.2s ease;
	}

	a.row:hover,
	a.row:focus-visible,
	a.card:hover,
	a.card:focus-visible {
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.05),
			0 12px 32px rgba(0, 0, 0, 0.12);
	}

	a.row:focus-visible,
	a.card:focus-visible {
		outline: 2px solid var(--main-accent-color);
		outline-offset: 2px;
	}

	a.row:hover {
		transform: translateY(-1px);
	}

	a.card:hover {
		transform: translateY(-2px);
	}

	@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		a.row,
		a.card {
			background: #ffffff;
		}
	}

	a.row {
		display: flex;
		align-items: center;
		gap: 1rem;
		width: 100%;
		padding: 0.875rem 1.25rem 0.875rem 1rem;
	}

	.row-icon {
		width: 40px;
		height: 40px;
		flex-shrink: 0;
	}

	.row-body {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 2px;
	}

	.row-title {
		font-size: 1rem;
		font-weight: var(--font-weight-bold);
		line-height: 1.3;
		text-align: left;
	}

	.row-text {
		font-size: 0.8125rem;
		color: #5b6b7c;
	}

	.chevron {
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		color: var(--main-accent-color);
		transition: transform 0.2s ease;
	}

	a.row:hover .chevron {
		transform: translateX(3px);
	}

	a.card {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		padding: 1.25rem;
	}

	.card-top {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.card-icon {
		width: 36px;
		height: 36px;
		flex-shrink: 0;
	}

	.card-title {
		flex: 1;
		font-size: 1.0625rem;
		font-weight: var(--font-weight-bold);
		line-height: 1.3;
		text-align: left;
	}

	.card-text {
		font-size: 0.875rem;
		color: #5b6b7c;
		line-height: 1.45;
		text-align: left;
	}

	.card-foot {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		margin-top: 0.25rem;
		font-size: 0.875rem;
	}

	.card-link {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		font-weight: var(--font-weight-bold);
		color: var(--main-accent-color);
		transition: gap 0.2s ease;
	}

	a.card:hover .card-link {
		gap: 0.5rem;
	}

	.card-link svg {
		width: 16px;
		height: 16px;
	}
</style>
