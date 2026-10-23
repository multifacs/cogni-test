<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getContext, onDestroy, onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import AiQuestionCard from '$lib/ai/questionnaire/AiQuestionCard.svelte';
	import { AI_SURVEY_INTRO } from '$lib/ai/questionnaire/questions';
	import {
		computeAiSurveyProgress,
		nextQuestion,
		q6Branch,
		visibleQuestions
	} from '$lib/ai/questionnaire/branching';
	import type { AiSurveyAnswers } from '$lib/ai/questionnaire/types';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const headerContext = getContext<{ value: string }>('headerText');

	/** Профиль пользователя из layout — только поля, нужные для префилла. */
	interface PrefillUser {
		birthday: string | Date;
		sex: 'male' | 'female';
	}

	/**
	 * Префилл Q28/Q29 из профиля пользователя (редактируемые дефолты, НЕ readonly):
	 * - Q28 «год рождения» ← год из user.birthday;
	 * - Q29 «пол» ← user.sex ('male' → 'Мужской', 'female' → 'Женский').
	 * Подставляется только если в сохранённых ответах значения ещё нет.
	 */
	function prefillAnswers(base: AiSurveyAnswers, user: PrefillUser | null): AiSurveyAnswers {
		const result: AiSurveyAnswers = { ...base };
		if (!user) return result;
		if (result['q28'] === undefined) {
			const year = new Date(user.birthday).getUTCFullYear();
			if (Number.isFinite(year)) {
				result['q28'] = year;
			}
		}
		if (result['q29'] === undefined) {
			result['q29'] = { choice: user.sex === 'female' ? 'Женский' : 'Мужской' };
		}
		return result;
	}

	// Локальное состояние ответов: инициализируется один раз (навигация внутри
	// страницы идёт с invalidateAll: false — load не перезаписывает правки).
	const answers = $state<AiSurveyAnswers>(prefillAnswers({ ...data.answers }, data.user));

	const branch = $derived(q6Branch(answers));
	const visible = $derived(visibleQuestions(branch));
	const progress = $derived(computeAiSurveyProgress(answers));

	// Текущий вопрос — query ?q=N: индекс в списке видимых вопросов ветки.
	const qParam = $derived(page.url.searchParams.get('q'));
	const currentIndex = $derived(
		qParam === null
			? -1
			: Math.min(Math.max(Number.parseInt(qParam, 10) || 0, 0), visible.length - 1)
	);
	const currentQuestion = $derived(currentIndex >= 0 ? (visible[currentIndex] ?? null) : null);
	const isLast = $derived(currentIndex === visible.length - 1);

	onMount(() => {
		if (headerContext) headerContext.value = 'Анкета ИИ';
	});

	/* ----------------------------- Навигация ----------------------------- */

	// replaceState: F5-семантика та же (текущий вопрос сохраняется в URL),
	// invalidateAll: false — load не рефетчается, локальные ответы не затираются.
	const NAV_OPTS = {
		replaceState: true,
		invalidateAll: false,
		keepFocus: true,
		noScroll: true
	} as const;

	function start() {
		void goto('/ai/ai-life?q=0', NAV_OPTS);
	}

	function next() {
		if (!currentQuestion) return;
		const nextId = nextQuestion(currentQuestion.id, branch);
		if (nextId === null) return;
		const index = visible.findIndex((q) => q.id === nextId);
		if (index === -1) return;
		void goto(`/ai/ai-life?q=${index}`, NAV_OPTS);
	}

	function prev() {
		if (currentIndex < 0) return;
		if (currentIndex === 0) {
			void goto('/ai/ai-life', NAV_OPTS);
			return;
		}
		void goto(`/ai/ai-life?q=${currentIndex - 1}`, NAV_OPTS);
	}

	// Смена ответа Q6 может сменить ветку и «схлопнуть» список видимых вопросов:
	// если индекс вышел за границы — корректный переход на ближайший видимый
	// (forward-clamp).
	$effect(() => {
		if (qParam === null) return;
		const parsed = Number.parseInt(qParam, 10);
		if (Number.isNaN(parsed) || parsed < 0 || parsed >= visible.length) {
			const clamped = Number.isNaN(parsed)
				? 0
				: Math.min(Math.max(parsed, 0), visible.length - 1);
			void goto(`/ai/ai-life?q=${clamped}`, NAV_OPTS);
		}
	});

	/* ---------------------------- Автосохранение ---------------------------- */

	const AUTOSAVE_DELAY_MS = 600;
	let saveTimer: ReturnType<typeof setTimeout> | null = null;

	async function saveNow(): Promise<void> {
		try {
			const fd = new FormData();
			fd.append('answers', JSON.stringify(answers));
			const res = await fetch('/ai/ai-life?/save', { method: 'POST', body: fd });
			if (!res.ok) throw new Error(`Save failed: ${res.status}`);
		} catch (e) {
			console.error('[ai-survey autosave] failed', e);
		}
	}

	function scheduleSave(): void {
		if (saveTimer !== null) clearTimeout(saveTimer);
		saveTimer = setTimeout(() => {
			saveTimer = null;
			void saveNow();
		}, AUTOSAVE_DELAY_MS);
	}

	// Обычная (не $state) переменная: initialized гасит автосейв при монтировании
	// (дефолты и префилл Q28/Q29 не отправляют fetch сами по себе).
	let autosaveInitialized = false;

	$effect(() => {
		void JSON.stringify(answers); // глубокая зависимость от всех ответов
		if (!autosaveInitialized) {
			autosaveInitialized = true;
			return;
		}
		scheduleSave();
	});

	async function submit() {
		if (saveTimer !== null) {
			clearTimeout(saveTimer);
			saveTimer = null;
		}
		await saveNow();
		void goto('/ai');
	}

	// При уходе со страницы незавершённый debounce не должен терять правки
	onDestroy(() => {
		if (saveTimer !== null) {
			clearTimeout(saveTimer);
			saveTimer = null;
			void saveNow();
		}
	});
</script>

<main class="main glass-scene flex w-full flex-col items-center justify-center-safe">
	<div class="glass-bg" aria-hidden="true">
		<div class="glass-blob glass-blob--top"></div>
		<div class="glass-blob glass-blob--bottom"></div>
	</div>

	<div class="ai-life-content relative z-1 flex w-full max-w-2xl flex-col gap-6 p-6 max-sm:p-4">
		{#if currentQuestion === null}
			<div class="glass-card flex flex-col gap-6 p-6">
				<h2 class="card-title">Анкета «Взаимодействие с ИИ»</h2>
				<p class="intro-text">{AI_SURVEY_INTRO}</p>
				<Button color="green" onclick={start}>Начать</Button>
			</div>
		{:else}
			<div class="glass-card flex flex-col gap-6 p-6">
				<div class="meta-row">
					<span class="counter">Вопрос {currentIndex + 1} / {visible.length}</span>
					<span class="counter">Пройдено {progress.percent}%</span>
				</div>

				<AiQuestionCard
					question={currentQuestion}
					bind:value={answers[currentQuestion.id]}
				/>

				<div class="nav-row">
					<Button color="blue" onclick={prev}>← Предыдущий</Button>
					{#if isLast}
						<Button color="green" onclick={submit}>Отправить</Button>
					{:else}
						<Button color="green" onclick={next}>Следующий →</Button>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</main>

<style>
	.card-title {
		font-weight: 800;
		font-size: 1.75rem;
		color: var(--main-text-color);
	}

	.intro-text {
		white-space: pre-line;
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--main-text-color);
	}

	.meta-row {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
	}

	.counter {
		font-size: 0.8125rem;
		font-weight: 600;
		opacity: 0.6;
		color: var(--main-text-color);
	}

	.nav-row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
	}
</style>
