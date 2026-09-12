<script lang="ts">
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PathnameWithSearchOrHash, ResolvedPathname } from '$app/types';
	import type { SkillMetric } from '$lib/types';
	import { getMetricShares, metricColor } from '$lib/shared/metricShares';
	import { translate } from '$lib/utils';

	const resolvePathname = resolve as (path: PathnameWithSearchOrHash) => ResolvedPathname;

	let {
		metricScores,
		hasData
	}: {
		metricScores: Record<SkillMetric, number>;
		hasData: boolean;
	} = $props();

	const shares = $derived(getMetricShares(metricScores));
	const donutData = $derived(
		shares
			.filter((s) => s.share > 0)
			.map((s, i, arr) => {
				const circumference = 2 * Math.PI * 36;
				const startShare = arr.slice(0, i).reduce((sum, prev) => sum + prev.share, 0);
				const midAngle = (startShare + s.share / 2) * 2 * Math.PI; // от верха, по часовой
				return {
					metric: s.metric,
					share: s.share,
					dashArray: `${s.share * circumference} ${circumference}`,
					offset: -startShare * circumference,
					// координаты середины дуги (без rotate-хака кругов)
					x: 50 + 36 * Math.sin(midAngle),
					y: 50 - 36 * Math.cos(midAngle)
				};
			})
	);

	function handleClick(event: MouseEvent) {
		event.preventDefault();
		goto(resolvePathname('/metrics' as PathnameWithSearchOrHash));
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			goto(resolvePathname('/metrics' as PathnameWithSearchOrHash));
		}
	}
</script>

<a
	class="card"
	href={resolvePathname('/metrics' as PathnameWithSearchOrHash)}
	onclick={handleClick}
	onkeydown={handleKeydown}
	aria-label="Открыть раздел Метрики"
>
	<h2 class="card-title">Метрики</h2>
	{#if !hasData || shares.length === 0}
		<div class="placeholder">
			<p>Данных по метрикам нет</p>
		</div>
	{:else}
		<div class="donut-wrapper">
			<svg viewBox="0 0 100 100" class="donut shrink-0" aria-hidden="true">
				{#each donutData as { metric, share, dashArray, offset, x, y } (metric)}
					<circle
						cx="50"
						cy="50"
						r="36"
						fill="none"
						stroke={metricColor(metric)}
						stroke-width="20"
						stroke-dasharray={dashArray}
						stroke-dashoffset={offset}
						transform="rotate(-90 50 50)"
					>
						<title>{translate(metric)} — {Math.round(share * 100)}%</title>
					</circle>
					{#if share >= 0.1}
						<text {x} y={y + 2} text-anchor="middle" font-size="6" fill="#333">
							{translate(metric)}
						</text>
					{/if}
				{/each}
			</svg>
			<ul class="legend min-w-0 flex-1">
				{#each donutData as d (d.metric)}
					<li class="flex items-center gap-1 text-xs">
						<div
							class="h-2 w-2 rounded-full shrink-0"
							style="background: {metricColor(d.metric)}"
						></div>
						<span class="min-w-0 flex-1 truncate">{translate(d.metric)}:</span>
						<span class="shrink-0">{Math.round(d.share * 100)}%</span>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</a>

<style>
	.card {
		position: relative;
		z-index: 1;
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
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		width: 100%;
		padding: 1.25rem;
		color: inherit;
		text-decoration: none;
		cursor: pointer;
	}

	.card:hover,
	.card:focus-visible {
		box-shadow:
			0 2px 4px rgba(0, 0, 0, 0.05),
			0 12px 32px rgba(0, 0, 0, 0.12);
		transform: translateY(-1px);
	}

	.card:focus-visible {
		outline: 2px solid var(--main-accent-color);
		outline-offset: 2px;
	}

	@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) {
		.card {
			background: #ffffff;
		}
	}

	.card-title {
		font-size: 1.0625rem;
		font-weight: var(--font-weight-bold);
		line-height: 1.3;
		text-align: left;
	}

	.placeholder {
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: 120px;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.donut-wrapper {
		display: flex;
		justify-content: center;
		align-items: center;
		gap: 10px;
	}

	.donut {
		width: 160px;
		height: 160px;
	}
</style>
