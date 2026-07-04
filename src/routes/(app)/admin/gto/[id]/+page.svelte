<script lang="ts">
	import Button from '$lib/components/ui/Button.svelte';
	import Toast from '$lib/components/ui/Toast.svelte';
	import type { PageProps } from './$types';
	import type { GtoEditableMetricDetail } from '$lib/server/db/controllers/gto';

	let { data }: PageProps = $props();
	let editingName = $state(false);
	let sessionName = $state(data.session.name);
	let savingMetrics = $state<Set<string>>(new Set());
	let toastMessage = $state<string | null>(null);
	let toastType = $state<'error' | 'success' | 'info'>('info');

	function showToast(message: string, type: 'error' | 'success' | 'info' = 'error') {
		toastMessage = message;
		toastType = type;
	}

	function formatDate(dateStr: string) {
		return new Date(dateStr).toLocaleString('ru-RU');
	}

	function fmt(val: number | null, decimals = 2): string {
		if (val === null) return '—';
		return val.toFixed(decimals);
	}

	function pct(val: number): string {
		return (val * 100).toFixed(1) + '%';
	}

	const balanceTestOptions = ['0-15', '15-30', '30-45', '45-60', '60+'] as const;

	async function handleRename() {
		const form = new FormData();
		form.set('name', sessionName);
		const response = await fetch('?/rename', { method: 'POST', body: form });
		if (!response.ok) {
			showToast('Ошибка переименования');
			return;
		}
		editingName = false;
	}

	async function handleComplete() {
		const form = new FormData();
		const response = await fetch('?/complete', { method: 'POST', body: form });
		if (!response.ok) {
			showToast('Ошибка завершения сессии');
			return;
		}
		location.reload();
	}

	async function submitMetrics(participantId: string, formElement: HTMLFormElement) {
		savingMetrics = new Set([...savingMetrics, participantId]);
		try {
			const formData = new FormData(formElement);
			const form = new FormData();
			form.set('participantId', participantId);

			const metrics: Record<string, unknown> = {};
			const balanceTest = formData.get('balanceTest') as string | null;
			if (balanceTest) metrics.balanceTest = balanceTest;

			for (const field of [
				'mazeQ1',
				'mazeQ2',
				'mazeQ3',
				'mazeVRNumber',
				'buttonTestNumber'
			]) {
				const val = formData.get(field) as string | null;
				if (val !== null && val !== '') metrics[field] = parseInt(val);
			}
			for (const field of ['mazeVRFileName', 'buttonTestFileName']) {
				const val = formData.get(field) as string | null;
				if (val !== null) metrics[field] = val;
			}

			const response = await fetch('?/updateMetrics', {
				method: 'POST',
				body: form
			});

			if (!response.ok) {
				showToast('Ошибка сохранения метрик');
			}
		} catch {
			showToast('Ошибка сохранения метрик');
		} finally {
			savingMetrics = new Set([...savingMetrics].filter((id) => id !== participantId));
		}
	}
</script>

<section class="banner">
	<div class="flex items-center gap-4">
		{#if editingName}
			<div class="flex items-center gap-2">
				<input
					type="text"
					bind:value={sessionName}
					class="rounded-lg bg-gray-700 p-2 text-2xl font-bold text-white"
				/>
				<Button color="green" onclick={handleRename}>Сохранить</Button>
				<Button color="gray" onclick={() => (editingName = false)}>Отмена</Button>
			</div>
		{:else}
			<h1 class="text-2xl font-bold">{data.session.name}</h1>
			<button
				class="text-sm opacity-60 hover:opacity-100"
				onclick={() => (editingName = true)}
			>
				✏️
			</button>
		{/if}
		<span
			class="rounded-full px-3 py-1 text-sm {data.session.status === 'active'
				? 'bg-green-800 text-green-200'
				: 'bg-gray-600 text-gray-300'}"
		>
			{data.session.status === 'active' ? 'Активна' : 'Завершена'}
		</span>
	</div>
	<p class="text-sm opacity-60">{formatDate(data.session.createdAt)}</p>
</section>

<main class="main overflow-auto p-4">
	<div class="flex flex-col gap-4">
		<!-- Words -->
		{#if data.session.words.length > 0}
			<div class="flex flex-col gap-1">
				<h3 class="text-sm font-medium">Слова:</h3>
				<div class="flex gap-2">
					{#each data.session.words as w (w.position)}
						<span class="rounded-lg bg-gray-700 px-3 py-1 text-sm"
							>{w.position + 1}. {w.word}</span
						>
					{/each}
				</div>
			</div>
		{/if}

		<!-- Complete button -->
		{#if data.session.status === 'active'}
			<Button color="red" onclick={handleComplete}>Завершить сессию</Button>
		{/if}

		<!-- Metrics table -->
		<div class="overflow-x-auto">
			<table class="w-full text-xs">
				<thead>
					<tr class="border-b border-gray-600 text-left">
						<th class="p-2">#</th>
						<th class="p-2">ID</th>
						<th class="p-2">Имя</th>
						<th class="p-2">Фамилия</th>
						<th class="p-2">Пол</th>
						<th class="p-2">Возраст</th>
						<th class="p-2">Незап.</th>
						<th class="p-2" colspan="3">Струп 1 (t/σ/точн)</th>
						<th class="p-2" colspan="3">Струп 2 (t/σ/точн)</th>
						<th class="p-2" colspan="3">Струп 3 (t/σ/точн)</th>
						<th class="p-2" colspan="3">Арифм (t/σ/точн)</th>
						<th class="p-2" colspan="4">Мюнстерберг (t/σ/доля/кол-во)</th>
						<th class="p-2" colspan="3">Камп. эт1 (t/σ/δ)</th>
						<th class="p-2" colspan="3">Камп. эт2 (t/σ/δ)</th>
						<th class="p-2" colspan="3">Камп. (недож/точно/переж)</th>
						<th class="p-2" colspan="3">Память (t/σ/точн)</th>
						<th class="p-2" colspan="3">Ласточка (t/σ/точн)</th>
						<th class="p-2">Слова</th>
						<th class="p-2">Баланс</th>
						<th class="p-2">Лаб. Q1</th>
						<th class="p-2">Лаб. Q2</th>
						<th class="p-2">Лаб. Q3</th>
						<th class="p-2">Лаб. VR</th>
						<th class="p-2">Кнопочки</th>
						<th class="p-2"></th>
					</tr>
				</thead>
				<tbody>
					{#each data.metrics as m, i (m.participantId)}
						{@const em = m.editableMetrics as GtoEditableMetricDetail}
						<tr class="border-b border-gray-700 hover:bg-gray-700">
							<td class="p-2">{i + 1}</td>
							<td class="p-2 font-mono text-xs opacity-60"
								>{m.participantId.slice(0, 8)}...</td
							>
							<td class="p-2">{m.firstname}</td>
							<td class="p-2">{m.lastname}</td>
							<td class="p-2">{m.sex === 'male' ? 'М' : 'Ж'}</td>
							<td class="p-2">{m.age}</td>
							<td class="p-2"
								>{m.missingSurveyFields.length > 0
									? m.missingSurveyFields.length
									: '✓'}</td
							>

							<!-- Stroop stage 1 -->
							<td class="p-2">{fmt(m.stroop.stage1.meanTime)}</td>
							<td class="p-2">{fmt(m.stroop.stage1.stdDevTime)}</td>
							<td class="p-2">{pct(m.stroop.stage1.accuracy)}</td>

							<!-- Stroop stage 2 -->
							<td class="p-2">{fmt(m.stroop.stage2.meanTime)}</td>
							<td class="p-2">{fmt(m.stroop.stage2.stdDevTime)}</td>
							<td class="p-2">{pct(m.stroop.stage2.accuracy)}</td>

							<!-- Stroop stage 3 -->
							<td class="p-2">{fmt(m.stroop.stage3.meanTime)}</td>
							<td class="p-2">{fmt(m.stroop.stage3.stdDevTime)}</td>
							<td class="p-2">{pct(m.stroop.stage3.accuracy)}</td>

							<!-- Math -->
							<td class="p-2">{fmt(m.math.meanTime)}</td>
							<td class="p-2">{fmt(m.math.stdDevTime)}</td>
							<td class="p-2">{pct(m.math.accuracy)}</td>

							<!-- Munsterberg -->
							<td class="p-2">{fmt(m.munsterberg.meanTime)}</td>
							<td class="p-2">{fmt(m.munsterberg.stdDevTime)}</td>
							<td class="p-2">{pct(m.munsterberg.fractionGuessed)}</td>
							<td class="p-2">{m.munsterberg.totalWordsHidden}</td>

							<!-- Campimetry stage 1 -->
							<td class="p-2">{fmt(m.campimetry.stage1.meanTime)}</td>
							<td class="p-2">{fmt(m.campimetry.stage1.stdDevTime)}</td>
							<td class="p-2">{fmt(m.campimetry.stage1.meanDelta)}</td>

							<!-- Campimetry stage 2 -->
							<td class="p-2">{fmt(m.campimetry.stage2.meanTime)}</td>
							<td class="p-2">{fmt(m.campimetry.stage2.stdDevTime)}</td>
							<td class="p-2">{fmt(m.campimetry.stage2.meanDelta)}</td>

							<!-- Campimetry breakdown -->
							<td class="p-2">{m.campimetry.stage2Breakdown.underPress}</td>
							<td class="p-2">{m.campimetry.stage2Breakdown.exact}</td>
							<td class="p-2">{m.campimetry.stage2Breakdown.overPress}</td>

							<!-- Memory -->
							<td class="p-2">{fmt(m.memory.meanTime)}</td>
							<td class="p-2">{fmt(m.memory.stdDevTime)}</td>
							<td class="p-2">{pct(m.memory.accuracy)}</td>

							<!-- Swallow -->
							<td class="p-2">{fmt(m.swallow.meanTime)}</td>
							<td class="p-2">{fmt(m.swallow.stdDevTime)}</td>
							<td class="p-2">{pct(m.swallow.accuracy)}</td>

							<!-- Word score -->
							<td class="p-2">{m.wordScore !== null ? m.wordScore : '—'}</td>

							<!-- Editable metrics -->
							<td class="p-2">
								<select name="balanceTest" class="rounded bg-gray-700 p-1 text-xs">
									<option value="" selected={!em.balanceTest}>—</option>
									{#each balanceTestOptions as opt}
										<option value={opt} selected={em.balanceTest === opt}
											>{opt}</option
										>
									{/each}
								</select>
							</td>
							<td class="p-2">
								<input
									type="number"
									name="mazeQ1"
									min="0"
									max="1"
									value={em.mazeQ1 ?? ''}
									class="w-12 rounded bg-gray-700 p-1 text-xs"
									placeholder="Q1"
								/>
							</td>
							<td class="p-2">
								<input
									type="number"
									name="mazeQ2"
									min="0"
									max="1"
									value={em.mazeQ2 ?? ''}
									class="w-12 rounded bg-gray-700 p-1 text-xs"
									placeholder="Q2"
								/>
							</td>
							<td class="p-2">
								<input
									type="number"
									name="mazeQ3"
									min="0"
									max="1"
									value={em.mazeQ3 ?? ''}
									class="w-12 rounded bg-gray-700 p-1 text-xs"
									placeholder="Q3"
								/>
							</td>
							<td class="p-2">
								<input
									type="number"
									name="mazeVRNumber"
									value={em.mazeVRNumber ?? ''}
									class="w-14 rounded bg-gray-700 p-1 text-xs"
									placeholder="VR#"
								/>
							</td>
							<td class="p-2">
								<input
									type="number"
									name="buttonTestNumber"
									min="0"
									max="20"
									value={em.buttonTestNumber ?? ''}
									class="w-14 rounded bg-gray-700 p-1 text-xs"
									placeholder="Кн#"
								/>
							</td>
							<td class="p-2">
								<button
									class="rounded bg-green-700 px-2 py-1 text-xs hover:bg-green-800 disabled:opacity-50"
									disabled={savingMetrics.has(m.participantId)}
									onclick={async (e) => {
										const row = (e.currentTarget as HTMLElement).closest('tr');
										if (!row) return;
										const inputs = row.querySelectorAll(
											'input[name], select[name]'
										);
										const fd = new FormData();
										fd.set('participantId', m.participantId);
										inputs.forEach((el) => {
											const input = el as
												| HTMLInputElement
												| HTMLSelectElement;
											if (input.name && input.value) {
												fd.set(input.name, input.value);
											}
										});
										savingMetrics = new Set([
											...savingMetrics,
											m.participantId
										]);
										try {
											const response = await fetch('?/updateMetrics', {
												method: 'POST',
												body: fd
											});
											if (!response.ok) {
												showToast('Ошибка сохранения метрик');
											}
										} catch {
											showToast('Ошибка сохранения метрик');
										} finally {
											savingMetrics = new Set(
												[...savingMetrics].filter(
													(id) => id !== m.participantId
												)
											);
										}
									}}
								>
									💾
								</button>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</main>

<section class="low-content flex items-center justify-center">
	<Button color="gray" goto="/admin/gto">← Сессии ГТО-М</Button>
</section>

{#if toastMessage}
	<Toast message={toastMessage} type={toastType} onDismiss={() => (toastMessage = null)} />
{/if}
