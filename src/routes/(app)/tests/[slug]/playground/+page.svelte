<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import Button from '$lib/components/ui/Button.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import type { MetaResult, RegularResults } from '$lib/tests/types.js';
	import { getContext, type Component as ComponentType } from 'svelte';
	import { testRegistry } from '$lib/tests';
	import { completeTest, isStreamingActive } from '$lib/stores/streaming.svelte';
	import { enqueueAttempt } from '$lib/client/offline-queue';
	import type { DevAction } from '$lib/types/header-action';
	import { generate } from 'short-uuid';

	const { data } = $props();
	const slug = $derived(data.slug);
	const test = $derived(testRegistry[slug]);
	let Component: ComponentType | null = $state(null);

	let isGameEnd = $state(false);
	let isSaving = $state(false);
	let saveError = $state(false);
	let pendingResults: RegularResults | MetaResult | null = $state(null);
	// Not rendered — plain variable is enough; retry reuses it to stay idempotent
	let pendingSessionId: string | undefined;

	// GTO session integration: read gtoSessionId from URL params
	const gtoSessionId = $derived(page.url.searchParams.get('gtoSessionId') ?? undefined);

	// Streaming (runAll) mode: «Назад» ведёт на /home — выход из серии
	// без остановки стрима: очередь живёт в streaming-store, и возврат
	// на /tests продолжит серию. В GTO-сессии «Назад» реально работает (backUrl).
	const isStreaming = $derived(isStreamingActive() && !gtoSessionId);

	import type { PathnameWithSearchOrHash } from '$app/types';
	import { resolve } from '$app/paths';

	const backUrl = $derived(
		(gtoSessionId
			? `/tests/${slug}/about?gtoSessionId=${gtoSessionId}`
			: `/tests/${slug}`) satisfies PathnameWithSearchOrHash
	);

	// Единая цель «Назад»: в потоковом режиме — /home (стрим не останавливается),
	// иначе обычный backUrl (about в GTO-сессии / список тестов).
	const backTarget = $derived(isStreaming ? '/home' : backUrl);

	$effect(() => {
		// Reset game state when the test changes (e.g. GTO navigating between tests)
		isGameEnd = false;
		Component = null;
		if (test) {
			test.playground().then((mod) => {
				Component = mod.default;
			});
		}
	});

	// Shared header context (owned by (app) layout): DEV-only banner slot
	const headerContext = getContext<{ value: string; devAction: DevAction }>('headerText');

	// DEV autoplay: ask the server for random results, then push them through
	// the same save path as a real game run. onSendResults owns the navigation:
	// goto fires only after the server confirms the save; on saveError the
	// page stays put (no onGameEnd call — the end-screen is not part of autoplay).
	async function runAutoplay() {
		const response = await fetch(`/tests/${slug}/playground`, {
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
	}

	$effect(() => {
		// Register the "Автопрохождение" banner button only for known tests in
		// DEV mode. The cleanup resets it on unmount/slug change so the button
		// never leaks to about/results pages. Offline tolerance: isDevMode
		// undefined → no registration, no errors.
		if (data.isDevMode && test) {
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

	async function onSendResults(results: RegularResults | MetaResult) {
		if (isSaving) return;
		// Sync before the first await: games call gameEnd() right before
		// sendResults() in the same tick, so the saving state must be visible
		// in the same render batch (no button flicker).
		isSaving = true;
		saveError = false;
		pendingResults = results;
		pendingSessionId ??= generate();
		try {
			if (gtoSessionId) {
				// GTO mode: save result and link to GTO session, advance checkpoint
				const response = await fetch(`/gto/session/${gtoSessionId}/play`, {
					method: 'POST',
					body: JSON.stringify({ action: 'save-result', testType: slug, results }),
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
				// must see the fresh attempt, so goto only after response.ok
				// (on !ok the offline queue takes over, see fallback below)
				const response = await fetch(`/tests/${slug}/playground`, {
					method: 'POST',
					body: JSON.stringify({ results, sessionId: pendingSessionId }),
					headers: {
						'Content-Type': 'application/json'
					}
				});

				if (!response.ok) {
					console.error('Failed to save test results', response.status);
					// Offline fallback: очередь надёжнее повторных POST —
					// результаты уйдут на сервер при следующем flush, а
					// пользователь уже видит страницу результатов с бейджем
					// «Ожидает загрузки». Rejection падает в общий catch
					// (saveError-UI, без навигации).
					await enqueueAttempt(
						slug,
						{ sessionId: pendingSessionId ?? generate(), results },
						'test'
					);
					// Save-порядок (offline): сначала снять тест с streaming-очереди,
					// затем goto — results-страница должна увидеть очередь без этого теста.
					completeTest(slug);
					goto(resolve(`/tests/${slug}/results`));
					return;
				}

				// Save-порядок (online): сначала снять тест с streaming-очереди,
				// затем goto — results-страница должна увидеть очередь без этого теста.
				completeTest(slug);
				goto(resolve(`/tests/${slug}/results`));
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
	<main class="main relative flex flex-col items-center justify-evenly text-[--main-text-color]">
		<Component gameEnd={onGameEnd} sendResults={onSendResults} {data}></Component>
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
					<Button color="red" goto={backTarget}>Назад</Button>
				</div>
			</section>
		{:else}
			<section class="low-content grid grid-cols-2 gap-4">
				<Button color="red" goto={backTarget}>Назад</Button>
				{#if gtoSessionId}
					<Button color="blue" goto="/gto">К сессиям ГТО</Button>
				{:else}
					<Button color="blue" goto={`/tests/${slug}/results`}>Результаты</Button>
				{/if}
			</section>
		{/if}
	{:else}
		<section class="low-content grid grid-cols-3 gap-4">
			<div></div>
			<Button color="red" goto={backTarget}>Назад</Button>
			<div></div>
		</section>
	{/if}
{:else}
	<main class="main relative flex flex-col items-center justify-center gap-4">
		<Spinner></Spinner>
		<p>Загрузка теста {slug}...</p>
	</main>

	<section class="low-content grid grid-cols-3 gap-4">
		<div></div>
		<Button color="red" goto={backTarget}>Назад</Button>
		<div></div>
	</section>
{/if}
