<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { MetaResult, ExerciseResults } from '$lib/exercises/types.js';
	import { getContext, type Component as ComponentType } from 'svelte';
	import { exerciseRegistry, EXERCISE_SLUG_TO_TEST_TYPE } from '$lib/exercises';
	import type { DevAction } from '$lib/types/header-action';
	import { generate } from 'short-uuid';
	import { enqueueAttempt, flushQueue } from '$lib/client/offline-queue';

	const { data } = $props();
	const slug = $derived(data.slug);
	const exercise = $derived(exerciseRegistry[slug]);
	let Component: ComponentType | null = $state(null);

	let isGameEnd = $state(false);
	let isSaving = $state(false);
	let saveError = $state(false);
	let pendingResults: ExerciseResults | MetaResult | null = $state(null);
	// Not rendered — plain variable is enough; retry reuses it to stay idempotent
	// (the exercise endpoint accepts sessionId in the body)
	let pendingSessionId: string | undefined;

	// GTO session integration: read gtoSessionId from URL params
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	// Back URL: in GTO mode go to about page, otherwise exercise page
	import type { PathnameWithSearchOrHash } from '$app/types';
	import { resolve } from '$app/paths';

	const backUrl = $derived(
		(gtoSessionId
			? `/exercises/${slug}/about?gtoSessionId=${gtoSessionId}`
			: `/exercises/${slug}`) satisfies PathnameWithSearchOrHash
	);

	$effect(() => {
		// Reset game state when the exercise changes (e.g. GTO navigating between tests)
		isGameEnd = false;
		Component = null;
		if (exercise?.playground) {
			exercise.playground().then((mod) => {
				Component = mod.default;
			});
		}
	});

	// Shared header context (owned by (app) layout): DEV-only banner slot
	const headerContext = getContext<{ value: string; devAction: DevAction }>('headerText');

	// DEV autoplay: ask the server for random results, then push them through
	// the same save path as a real game run. onSendResults owns the navigation;
	// onGameEnd only switches to the local end-screen.
	async function runAutoplay() {
		const response = await fetch(`/exercises/${slug}/playground`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ action: 'generate-random' })
		});

		if (!response.ok) {
			console.error('Autoplay generation failed:', response.status);
			return;
		}

		const { results } = await response.json();

		await onSendResults(results);
		if (!gtoSessionId) {
			onGameEnd();
		}
	}

	$effect(() => {
		// Register the "Автопрохождение" banner button only for raven-matrices
		// (the 7th GTO test) in DEV mode. The cleanup resets it on unmount/slug
		// change so the button never leaks to other pages. Offline tolerance:
		// isDevMode undefined → no registration, no errors.
		if (data.isDevMode && slug === 'raven-matrices') {
			if (headerContext) {
				headerContext.devAction = { label: 'Автопрохождение', onclick: runAutoplay };
			}
		}
		return () => {
			if (headerContext) {
				headerContext.devAction = null;
			}
		};
	});

	function onGameEnd() {
		// Local end-screen only: navigation is onSendResults' job
		isGameEnd = true;
	}

	async function onSendResults(results: ExerciseResults | MetaResult) {
		if (isSaving) return;
		// Sync before the first await: exercises games call gameEnd() right
		// before sendResults() in the same tick, so the saving state must be
		// visible in the same render batch (no button flicker).
		isSaving = true;
		saveError = false;
		pendingResults = results;
		pendingSessionId ??= generate();
		try {
			if (gtoSessionId) {
				// GTO mode: save result and link to GTO session, advance checkpoint
				const response = await fetch(`/gto/session/${gtoSessionId}/play`, {
					method: 'POST',
					body: JSON.stringify({
						action: 'save-result',
						testType: EXERCISE_SLUG_TO_TEST_TYPE[slug] ?? slug,
						results
					}),
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (!response.ok) {
					console.error('Failed to save GTO results', response.status);
					saveError = true;
					return;
				}

				const result = await response.json();

				if (result.nextTestUrl) {
					// Navigate to next test's about page in GTO sequence
					goto(result.nextTestUrl);
				} else {
					// All tests done — go to words page
					goto(resolve(`/gto/session/${gtoSessionId}/words`));
				}
			} else {
				// Standalone mode: save, then navigate — the results page load
				// must see the fresh attempt (or the pending offline attempt),
				// so goto only after response.ok or offline-enqueue
				let saved = false;
				try {
					const response = await fetch(`/exercises/${slug}/playground`, {
						method: 'POST',
						body: JSON.stringify({ results, sessionId: pendingSessionId }),
						headers: {
							'Content-Type': 'application/json'
						}
					});
					saved = response.ok;
					if (!saved) {
						console.error('Failed to save exercise results', response.status);
					}
				} catch {
					saved = false;
				}

				if (saved) {
					goto(resolve(`/exercises/${slug}/results`));
					return;
				}

				// Save failed (or threw): put the attempt into the offline
				// queue — data is only "safe" when it is on the server OR in
				// the queue. Universal fallback for ALL exercises.
				// MAJOR-1: ждём фактической записи в очередь — отклонение
				// (localforage/quota) уходит в outer catch → error-UI без навигации
				await enqueueAttempt(slug, { sessionId: pendingSessionId, results });
				goto(resolve(`/exercises/${slug}/results`));

				// Fire-and-forget flush
				flushQueue().catch(() => {});
			}
		} catch {
			saveError = true;
		} finally {
			isSaving = false;
		}
	}

	function retrySave() {
		if (pendingResults === null) return;
		void onSendResults(pendingResults);
	}
</script>

{#if Component}
	<main class="main flex flex-col items-center justify-evenly">
		<Component
			gameEnd={onGameEnd}
			sendResults={exercise?.result || gtoSessionId ? onSendResults : undefined}
			{data}
		></Component>
	</main>

	{#if isGameEnd}
		{#if isSaving}
			<section class="low-content flex flex-col items-center justify-center gap-4">
				<Spinner></Spinner>
				<p>Сохранение результатов…</p>
			</section>
		{:else if saveError}
			<section class="low-content flex flex-col items-center justify-center gap-4">
				<p role="alert">Не удалось сохранить результаты</p>
				<div class="grid grid-cols-2 gap-4">
					<Button color="blue" onclick={retrySave}>Попробовать снова</Button>
					<Button color="red" goto={backUrl}>Назад</Button>
				</div>
			</section>
		{:else}
			<section class="low-content grid grid-cols-2 gap-4">
				<Button color="red" goto={backUrl}>Назад</Button>
				{#if gtoSessionId}
					<Button color="blue" goto="/gto">К сессиям ГТО</Button>
				{:else if exercise?.result}
					<Button color="blue" goto={`/exercises/${slug}/results`}>Результаты</Button>
				{:else}
					<div></div>
				{/if}
			</section>
		{/if}
	{:else}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto={backUrl}>Назад</Button>
			<div></div>
		</section>
	{/if}
{:else}
	<main class="main flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка упражнения {slug}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={backUrl}>Назад</Button>
		<div></div>
	</section>
{/if}
