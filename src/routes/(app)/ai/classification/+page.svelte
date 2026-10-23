<script lang="ts">
	import { goto } from '$app/navigation';
	import { getContext, onMount } from 'svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import {
		CLASSIFICATION_INSTRUCTION,
		CLASSIFICATION_TEXT,
		RETELLING_INSTRUCTION,
		CLASSIFICATION_MAX_TEXT_LENGTH,
		CLASSIFICATION_MAX_GROUPS,
		isWordInText
	} from '$lib/ai/classification-text';

	type Group = {
		id: number;
		words: string[];
		feature: string;
		wordInput: string;
	};

	let groupSeq = 0;

	function makeGroup(): Group {
		return { id: groupSeq++, words: [], feature: '', wordInput: '' };
	}

	let groups = $state<Group[]>([makeGroup()]);
	let retelling = $state('');
	let submitting = $state(false);
	let submitted = $state(false);
	let errorMsg = $state('');

	const headerContext = getContext<{ value: string }>('headerText');

	onMount(() => {
		if (headerContext) headerContext.value = 'Классификация';
	});

	// ─── Редактор групп (паттерн CustomChoice) ─────────────────────────

	const canAddGroup = $derived(groups.length < CLASSIFICATION_MAX_GROUPS);

	function addGroup(): void {
		if (!canAddGroup) return;
		groups.push(makeGroup());
	}

	function removeGroup(id: number): void {
		if (groups.length === 1) {
			// минимум одна группа остаётся — очищаем
			groups = [makeGroup()];
			return;
		}
		groups = groups.filter((g) => g.id !== id);
	}

	function addWord(group: Group): void {
		const word = group.wordInput.trim();
		group.wordInput = '';
		if (!word) return;
		if (!group.words.includes(word)) group.words.push(word);
	}

	function onWordKeydown(group: Group, e: KeyboardEvent): void {
		if (e.key === 'Enter') {
			e.preventDefault();
			addWord(group);
		}
	}

	function onWordInput(group: Group, value: string): void {
		// запятая — тоже разделитель слов (как в CustomChoice)
		if (value.endsWith(',')) {
			group.wordInput = value.slice(0, -1);
			addWord(group);
			return;
		}
		group.wordInput = value;
	}

	function removeWord(group: Group, index: number): void {
		group.words.splice(index, 1);
	}

	/** Мягкая стем-проверка: невалидное слово — только визуальная пометка, БЕЗ блокировки отправки. */
	function isWordInvalid(word: string): boolean {
		return !isWordInText(word, CLASSIFICATION_TEXT);
	}

	// ─── Отправка ───────────────────────────────────────────────────────

	const hasAnyWord = $derived(
		groups.some((g) => g.words.length > 0 || g.wordInput.trim() !== '')
	);

	async function submit(): Promise<void> {
		if (submitting || submitted) return;

		// коммитим незавершённые вводы слов
		for (const group of groups) addWord(group);

		const payloadGroups = groups
			.filter((g) => g.words.length > 0)
			.map((g) => ({ words: g.words, feature: g.feature.trim() }));

		if (payloadGroups.length === 0) {
			errorMsg = 'Добавьте хотя бы одно слово в любую группу перед отправкой.';
			return;
		}

		submitting = true;
		errorMsg = '';
		try {
			const res = await fetch('/ai/classification', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ groups: payloadGroups, retelling: retelling.trim() })
			});
			if (res.status === 201) {
				submitted = true;
				return;
			}
			if (res.status === 401) {
				errorMsg = 'Сессия истекла. Войдите в систему заново.';
			} else {
				errorMsg = 'Не удалось отправить ответ. Попробуйте ещё раз.';
			}
		} catch {
			errorMsg = 'Ошибка сети. Проверьте соединение и попробуйте ещё раз.';
		} finally {
			submitting = false;
		}
	}

	// ─── Защита стимльного текста (best-effort) ─────────────────────────
	//
	// ЧЕСТНОЕ ОГРАНИЧЕНИЕ: это защита best-effort, а не гарантия.
	// - Буфер обмена браузер запретить нельзя (нет API для очистки чужого
	//   clipboard после копирования) — мы лишь блокируем события copy/cut
	//   внутри контейнера;
	// - PrintScreen перехватывается не во всех ОС/браузерах (например,
	//   macOS и сторонние скриншотеры его не шлют) — буфер мы НЕ обещаем
	//   очищать и НЕ очищаем;
	// - от фотографии экрана и телефона защиты не существует.
	// Цель — усложнить копирование «на автопилоте», не обманывая пользователя.

	let stimulusHidden = $state(false);
	let printHideTimeout: ReturnType<typeof setTimeout> | undefined;

	function hideStimulusTemporarily(): void {
		stimulusHidden = true;
		clearTimeout(printHideTimeout);
		printHideTimeout = setTimeout(() => {
			stimulusHidden = false;
		}, 2000);
	}

	function onWindowKeydown(e: KeyboardEvent): void {
		if (e.key === 'PrintScreen') hideStimulusTemporarily();
	}
</script>

<svelte:window
	onkeydown={onWindowKeydown}
	onblur={() => (stimulusHidden = true)}
	onfocus={() => (stimulusHidden = false)}
	onvisibilitychange={() => (stimulusHidden = document.hidden)}
/>

{#if submitted}
	<main class="main glass-scene flex w-full flex-col items-center justify-center-safe">
		<div class="glass-bg" aria-hidden="true">
			<div class="glass-blob glass-blob--top"></div>
			<div class="glass-blob glass-blob--bottom"></div>
		</div>

		<div
			class="glass-card thanks-card relative z-1 flex w-full max-w-2xl flex-col items-center gap-6 p-8"
		>
			<h2 class="card-title">Спасибо за прохождение!</h2>
			<p class="card-text">Ваш ответ сохранён.</p>
			<Button color="green" onclick={() => goto('/ai')}>← Вернуться в меню</Button>
		</div>
	</main>
{:else}
	<main class="main glass-scene flex w-full flex-col items-center justify-center-safe">
		<div class="glass-bg" aria-hidden="true">
			<div class="glass-blob glass-blob--top"></div>
			<div class="glass-blob glass-blob--bottom"></div>
		</div>

		<div class="glass-card page-card relative z-1 flex w-full max-w-3xl flex-col gap-6 p-6">
			<h2 class="card-title">Классификация слов</h2>

			<p class="instruction">{CLASSIFICATION_INSTRUCTION}</p>

			<!--
				Стимульный текст: защита best-effort (см. комментарий в <script>).
				user-select:none + блокировка copy/cut/contextmenu/dragstart +
				скрытие при blur/visibilitychange/PrintScreen + @media print.
			-->
			<div
				role="region"
				aria-label="Стимульный текст"
				class="stimulus"
				class:hidden={stimulusHidden}
				data-testid="stimulus"
				oncopy={(e) => e.preventDefault()}
				oncut={(e) => e.preventDefault()}
				oncontextmenu={(e) => e.preventDefault()}
				ondragstart={(e) => e.preventDefault()}
			>
				{CLASSIFICATION_TEXT}
			</div>

			<div class="groups" role="group" aria-label="Группы слов">
				{#each groups as group (group.id)}
					<div class="group" data-testid="group">
						<div class="group-head">
							<span class="group-label">Группа</span>
							<button
								type="button"
								class="group-remove"
								data-testid="remove-group"
								aria-label="Удалить группу"
								onclick={() => removeGroup(group.id)}
							>
								✕
							</button>
						</div>

						<div class="chips">
							{#each group.words as word, index (word)}
								<span
									class="word-chip"
									class:invalid={isWordInvalid(word)}
									data-testid="word-chip"
								>
									{#if isWordInvalid(word)}
										<span class="invalid-dot" title="Слово не найдено в тексте"
											>⚠</span
										>
									{/if}
									{word}
									<button
										type="button"
										class="word-remove"
										data-testid="remove-word"
										aria-label={`Удалить слово: ${word}`}
										onclick={() => removeWord(group, index)}
									>
										✕
									</button>
								</span>
							{/each}
						</div>

						<input
							type="text"
							class="word-input"
							data-testid="word-input"
							placeholder="Введите слово и нажмите Enter..."
							maxlength={CLASSIFICATION_MAX_TEXT_LENGTH}
							bind:value={group.wordInput}
							oninput={(e) => onWordInput(group, e.currentTarget.value)}
							onkeydown={(e) => onWordKeydown(group, e)}
							onblur={() => addWord(group)}
						/>

						<input
							type="text"
							class="feature-input"
							data-testid="feature-input"
							placeholder="Признак"
							maxlength={CLASSIFICATION_MAX_TEXT_LENGTH}
							bind:value={group.feature}
						/>
					</div>
				{/each}
			</div>

			<button
				type="button"
				class="add-group"
				data-testid="add-group"
				disabled={!canAddGroup}
				title={canAddGroup
					? 'Добавить группу'
					: `Достигнут лимит групп (${CLASSIFICATION_MAX_GROUPS})`}
				onclick={addGroup}
			>
				+
			</button>

			<label class="retelling-label" for="retelling">{RETELLING_INSTRUCTION}</label>
			<textarea
				id="retelling"
				class="retelling"
				data-testid="retelling"
				rows="3"
				maxlength={CLASSIFICATION_MAX_TEXT_LENGTH}
				bind:value={retelling}></textarea>

			{#if errorMsg}
				<p class="error" data-testid="error" role="alert">{errorMsg}</p>
			{/if}

			<Button color="green" onclick={submit} disabled={submitting}>
				{submitting ? 'Отправка...' : 'Отправить'}
			</Button>
		</div>
	</main>
{/if}

<style>
	.page-card,
	.thanks-card {
		display: flex;
	}

	.card-title {
		font-weight: 800;
		font-size: 1.75rem;
		color: var(--main-text-color);
	}

	.card-text {
		text-align: center;
		opacity: 0.75;
		color: var(--main-text-color);
	}

	.instruction {
		white-space: pre-line;
		color: var(--main-text-color);
		opacity: 0.9;
	}

	/* Стимул: защита best-effort — выделение и копирование блокируем,
	   но буфер обмена браузер очистить нельзя (см. комментарий в script). */
	.stimulus {
		user-select: none;
		-webkit-user-select: none;
		padding: 1rem 1.25rem;
		border-radius: 1rem;
		background-color: var(--input-bg-color);
		color: var(--main-text-color);
		font-weight: 600;
		line-height: 1.6;
		transition: opacity 0.15s ease;
	}

	.stimulus.hidden {
		opacity: 0;
	}

	@media print {
		.stimulus {
			display: none;
		}
	}

	.groups {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 1rem 1.25rem;
		border-radius: 1rem;
		background-color: var(--input-bg-color);
	}

	.group-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.group-label {
		font-weight: 700;
		color: var(--main-text-color);
	}

	.group-remove {
		cursor: pointer;
		border: none;
		background: none;
		font-weight: bold;
		color: var(--button-red);
		font-size: 1rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.word-chip {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.25rem 0.625rem;
		border-radius: 999px;
		background-color: #ffffff;
		border: 1px solid var(--input-bg-color);
		color: var(--main-text-color);
		font-weight: 600;
		font-size: 0.875rem;
	}

	.word-chip.invalid {
		border-color: #e0c36a;
		background-color: #fdf6dd;
	}

	.invalid-dot {
		cursor: help;
		color: #9a7d1f;
		font-size: 0.875rem;
	}

	.word-remove,
	.word-input,
	.feature-input {
		color: var(--main-text-color);
	}

	.word-remove {
		cursor: pointer;
		border: none;
		background: none;
		font-size: 0.75rem;
		opacity: 0.6;
	}

	.word-remove:hover {
		opacity: 1;
	}

	.word-input,
	.feature-input,
	.retelling {
		width: 100%;
		padding: 0.5rem 0.875rem;
		border-radius: 0.75rem;
		border: 2px solid var(--input-bg-color);
		background-color: #ffffff;
		outline: none;
		transition:
			border-color 0.15s ease,
			box-shadow 0.15s ease;
	}

	.word-input:focus,
	.feature-input:focus,
	.retelling:focus {
		border-color: var(--main-accent-color);
		box-shadow: 0 0 0 4px var(--input-bg-color);
	}

	.add-group {
		align-self: flex-start;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 50%;
		border: none;
		cursor: pointer;
		font-size: 1.25rem;
		font-weight: 700;
		background-color: var(--button-blue);
		color: var(--button-blue-text);
		transition: transform 0.15s ease;
	}

	.add-group:hover:not(:disabled) {
		transform: translateY(-2px);
	}

	.add-group:disabled {
		opacity: 0.4;
		cursor: not-allowed;
	}

	.retelling-label {
		font-weight: 600;
		color: var(--main-text-color);
	}

	.retelling {
		resize: vertical;
		font-family: inherit;
	}

	.error {
		color: var(--error-color);
		font-weight: 600;
	}
</style>
