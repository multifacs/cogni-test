<script lang="ts">
	import { goto } from '$app/navigation';
	import { getContext, onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import type { AiStage } from './+page.server';

	let { data } = $props();

	const headerContext = getContext<{ value: string }>('headerText');

	const AI_THANKS_SHOWN_KEY = 'ai_thanks_shown';

	let showModal = $state(false);

	onMount(() => {
		if (headerContext) headerContext.value = 'ИИ-влияние';

		// localStorage — только в браузере; показываем модалку один раз
		if (data.allDone && !localStorage.getItem(AI_THANKS_SHOWN_KEY)) {
			localStorage.setItem(AI_THANKS_SHOWN_KEY, '1');
			showModal = true;
		}
	});

	function closeModal() {
		showModal = false;
		goto('/home');
	}
</script>

<main class="main glass-scene flex w-full flex-col items-center justify-center-safe">
	<div class="glass-bg" aria-hidden="true">
		<div class="glass-blob glass-blob--bottom"></div>
	</div>

	<div class="glass-card stages-card relative z-1 flex w-full max-w-2xl flex-col gap-6 p-6">
		<h2 class="card-title">Влияние ИИ</h2>
		<p class="card-subtitle">
			Пройдите все этапы, чтобы мы могли оценить, как искусственный интеллект влияет на
			когнитивные способности
		</p>

		<ol class="stages-list">
			{#each data.stages as stage, index (stage.id)}
				<li class="stage {stage.status}">
					{#if stage.status === 'next'}
						<a
							href={stage.href}
							class="stage-link next"
							aria-label={`Перейти: ${stage.title}`}
						>
							<span class="stage-number">{index + 1}</span>
							<span class="stage-info">
								<span class="stage-title">{stage.title}</span>
								<span class="stage-description">{stage.description}</span>
							</span>
						</a>
					{:else if stage.status === 'done'}
						<!-- Done-карточка — кликабельная ссылка: перезапись результатов
					     (анкета → редактирование, ИИ-анкета → upsert, тесты → новые
					     сессии, классификация → перезапуск). stage.href уже несёт
					     нужный query (?from=ai) — используем как есть. -->
						<a
							href={stage.href}
							class="stage-link done"
							aria-label={`Пройти заново: ${stage.title}`}
							onclick={() => localStorage.removeItem(AI_THANKS_SHOWN_KEY)}
						>
							<span class="stage-number">✓</span>
							<span class="stage-info">
								<span class="stage-title">{stage.title}</span>
								<span class="stage-description">{stage.description}</span>
							</span>
							<span class="stage-actions">
								<span class="stage-badge">Пройдено</span>
							</span>
						</a>
					{:else}
						<div class="stage-link locked">
							<span class="stage-number">{index + 1}</span>
							<span class="stage-info">
								<span class="stage-title">{stage.title}</span>
								<span class="stage-description">{stage.description}</span>
							</span>
							<span class="stage-actions">
								<span class="stage-badge locked-badge">Заблокировано</span>
							</span>
						</div>
					{/if}
				</li>
			{/each}
		</ol>
	</div>
</main>

{#if showModal}
	<div
		class="modal-overlay"
		role="dialog"
		aria-modal="true"
		aria-label="Спасибо за прохождение"
		onkeydown={(e) => e.key === 'Escape' && closeModal()}
	>
		<div class="glass-card modal-card flex flex-col items-center gap-6 p-8">
			<h3 class="modal-title">Спасибо за прохождение!</h3>
			<p class="modal-text">Вы завершили все этапы исследования ИИ-влияния.</p>
			<Button color="green" onclick={closeModal}>Ок</Button>
		</div>
	</div>
{/if}

<style>
	.stages-card {
		display: flex;
	}

	.card-title {
		font-weight: 800;
		font-size: 1.75rem;
		color: var(--main-text-color);
	}

	.card-subtitle {
		opacity: 0.75;
		color: var(--main-text-color);
	}

	.stages-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.stage-link {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-radius: 1rem;
		background-color: var(--input-bg-color);
		transition: transform 0.15s ease;
	}

	.stage-link.next {
		background-color: var(--button-green);
		cursor: pointer;
		text-decoration: none;
	}

	.stage-link.next:hover {
		transform: translateY(-2px);
	}

	.stage-link.done {
		opacity: 0.55;
		background-color: transparent;
		border: 1px solid var(--input-bg-color);
		text-decoration: none;
	}

	.stage-link.done:hover {
		opacity: 0.85;
	}

	.stage-link.locked {
		opacity: 0.75;
	}

	.stage-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		flex-shrink: 0;
		font-weight: 700;
		color: var(--main-text-color);
		background-color: rgba(255, 255, 255, 0.7);
	}

	.stage-link.done .stage-number {
		color: var(--button-green-text);
	}

	.stage-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
	}

	.stage-title {
		font-weight: 700;
		color: var(--main-text-color);
	}

	.stage-description {
		font-size: 0.875rem;
		opacity: 0.75;
		color: var(--main-text-color);
	}

	.stage-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-left: auto;
		/* до ~40% ширины карточки: бейдж/CTA не вытесняют заголовок */
		max-width: 40%;
		min-width: 0;
	}

	.stage-badge {
		font-size: 0.75rem;
		font-weight: 600;
		padding: 0.25rem 0.75rem;
		border-radius: 999px;
		background-color: var(--button-blue);
		color: var(--button-blue-text);
		/* Узкие экраны: текст бейджа срезается с «…», а не растягивает карточку */
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		min-width: 0;
	}

	.modal-overlay {
		position: fixed;
		inset: 0;
		z-index: 50;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 1rem;
		background-color: rgba(44, 62, 80, 0.4);
	}

	.modal-card {
		max-width: 24rem;
	}

	.modal-title {
		font-weight: 800;
		font-size: 1.25rem;
		color: var(--main-text-color);
	}

	.modal-text {
		text-align: center;
		opacity: 0.75;
		color: var(--main-text-color);
	}
</style>
