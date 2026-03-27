<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { userStore } from '$lib/stores/user';
	import { derived } from 'svelte/store';

	import Button from '$lib/components/ui/Button.svelte';

	import { pushService } from '$lib/pushService';
	import { isSubscribed } from '$lib/utils/push';
	import Tabs from './components/Tabs.svelte';
	import Table from './components/Table.svelte';
	import TableRow from './components/TableRow.svelte';
	import Spinner from '$lib/components/ui/Spinner.svelte';
	import Autocomplete from './components/Autocomplete.svelte';

	const user = derived(userStore, ($userStore) => $userStore);
	let subscribed = $state(false);

	onMount(async () => {
		subscribed = await isSubscribed();
	});

	console.log($user);

	function formatBool(val: boolean | null): string {
		if (val === true) return 'Да';
		if (val === false) return 'Нет';
		return 'Не указано';
	}

	function formatAge(inputDate: Date) {
		const today = new Date();
		const birthDate = new Date(inputDate);

		let age = today.getFullYear() - birthDate.getFullYear();

		const hasHadBirthdayThisYear =
			today.getMonth() > birthDate.getMonth() ||
			(today.getMonth() === birthDate.getMonth() && today.getDate() >= birthDate.getDate());

		if (!hasHadBirthdayThisYear) {
			age--;
		}

		return age;
	}

	function formatSex(val: 'male' | 'female'): string {
		return val === 'male' ? 'Мужской' : 'Женский';
	}

	export function formatDate(date: Date): string {
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0'); // месяцы с 0
		const year = date.getFullYear();
		return `${day}.${month}.${year}`;
	}

	let showSpinner = $state(false);

	async function subscribe() {
		try {
			showSpinner = true;
			await pushService.subscribe();
			showSpinner = false;
			subscribed = true;
			console.log('Subscribed successfully');
		} catch (error) {
			console.error('Failed to subscribe:', error);
		}
	}

	async function unsubscribe() {
		try {
			await pushService.unsubscribe();
			subscribed = false;
			console.log('Unsubscribed successfully');
		} catch (error) {
			console.error('Failed to unsubscribe:', error);
		}
	}

	let activeTab = $state('tab1');

	const tabs = [
		{ id: 'tab1', label: '😀 Основное' },
		{ id: 'tab2', label: '🎓 Образование' },
		{ id: 'tab3', label: '💃 Хобби' },
		{ id: 'tab4', label: '💪 Тело' },
		{ id: 'tab5', label: '⚙️ Настройки' }
	];

	function onTabChange(tab: string) {
		console.log(tab);
		activeTab = tab;
	}
</script>

<main class="main grid w-full">
	<div class="flex w-full flex-col items-center justify-center">
		{#await $user}
			<p>Загрузка...</p>
		{:then u}
			{#if u && u.id}
				<!-- Tab Nav -->

				<Tabs {tabs} bind:activeTab {onTabChange}>
					<div class:hidden={activeTab !== 'tab1'}>
						<Table>
							<TableRow label="ID" value={u.id} />
							<TableRow
								label="Имя"
								type="input"
								value={`${u.firstname} ${u.lastname}`}
							/>
							<TableRow
								label="Дата рождения"
								type="input"
								value={formatDate(u.birthday)}
							/>
							<TableRow label="Возраст" type="value" value={formatAge(u.birthday)} />
							<TableRow
								label="Пол"
								type="choice"
								options={[
									{ label: 'Мужчина', value: 'male' },
									{ label: 'Женщина', value: 'female' }
								]}
								value={u.sex}
							/>
							<TableRow
								label="Населенный пункт, в котором вы прожили большую часть жизни"
								type="custom"
							>
								<Autocomplete></Autocomplete>
							</TableRow>
						</Table>
					</div>

					<div class:hidden={activeTab !== 'tab2'}>
						<Table>
							<TableRow
								label="Есть ли у вас высшее образование?"
								type="choice"
								isBoolean={true}
							/>
							<TableRow
								label="Cколько лет вы посвятили обучению (включая школу, среднее, высшее и дополнительное образование)?"
								type="range"
								min={0}
								max={50}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была работа, не требующая особой квалификации (охранник, официант, садовник, уборщик и т.д.)?"
								type="range"
								min={0}
								max={50}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была работа, требующая квалифицированного прикладного труда (медсестра, повар, парикмахер, слесарь и т.д.)?"
								type="range"
								min={0}
								max={50}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была работа, требующая квалифицированного не прикладного труда (агент по недвижимости, менеджер по продажам, музыкант, руководитель небольшого коллектива)?"
								type="range"
								min={0}
								max={50}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была профессиональная работа (управляющий компанией, адвокат, врач, учитель и т.д.)?"
								type="range"
								min={0}
								max={50}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была высокоответственная или интеллектуальная работа (директор крупной компании, ученый, профессор, судья, хирург)?"
								type="range"
								min={0}
								max={50}
							/>
						</Table>
					</div>
					<div class:hidden={activeTab !== 'tab3'}>
						<Table>
							<TableRow
								label="Укажите какими из представленных дел вы занимаетесь еженедельно:"
								value={''}
							/>
							<TableRow
								label="Чтение газет, журналов, книг"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Домашние обязанности (приготовление пищи, стирка, покупка продуктов и т.д.)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Хобби (шахматы, танцы, вязание, коллекционирование и т.д.)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Использование современных технологий (интернет, компьютер)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Укажите какими из представленных дел вы занимаетесь ежемесячно:"
								value={''}
							/>
							<TableRow
								label="Социальные мероприятия (клубя, ассоциации, собрания)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Кино, театр"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Садоводство, рукоделие"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Забота о ком-то (внуки, пожилые люди)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Волонтерская работа"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Художественная деятельность (пение, рисование, игра на музыкальных инструментах и т.д.)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Укажите какими из представленных дел вы занимаетесь ежегодно:"
								value={''}
							/>
							<TableRow
								label="Выставки, концерты, конференции"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Путешествия на несколько дней"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
							<TableRow
								label="Чтение книг"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
							/>
						</Table>
					</div>

					<div class:hidden={activeTab !== 'tab4'}>
						<Table>
							<TableRow label="Рост" type="range" min={100} max={250} />
							<TableRow label="Вес" type="range" min={50} max={250} />
							<TableRow
								label="Ведущая рука (какой рукой в основном пишете)"
								type="choice"
								options={[
									{ label: 'Правая', value: 'left' },
									{ label: 'Левая', value: 'right' }
								]}
							/>
							<TableRow
								label="Являетесь ли вы амбидекстром?"
								type="choice"
								isBoolean={true}
							/>
							<TableRow label="Хронические заболевания" type="input" />
							<TableRow
								label="Курение"
								type="choice"
								options={[
									{ label: 'Нет', value: 'no' },
									{ label: 'Да', value: 'yes' },
									{ label: 'Было', value: 'usedTo' }
								]}
							/>
							<TableRow
								label="Алкоголь"
								type="choice"
								options={[
									{ label: 'Нет', value: 'no' },
									{ label: 'Да (1+ в неделю)', value: 'yes' }
								]}
							/>
							<TableRow
								label="Какими видами спорта занимаетесь сейчас?"
								type="custom-choice"
								options={[
									{ label: 'Каждый день', value: 'everyday' },
									{ label: '5 раз в неделю', value: 'week5' },
									{ label: '3 раз в неделю', value: 'week3' },
									{ label: '1 раз в неделю', value: 'week1' },
									{ label: 'Раз в 2 недели', value: 'biweekly' },
									{ label: 'Раз в месяц', value: 'montly' }
								]}
							/>
							<TableRow
								label="Занимаетесь ли киберспортом или являетесь геймером?"
								type="choice"
								isBoolean={true}
							/>
						</Table>
					</div>

					<div class:hidden={activeTab !== 'tab5'}>
						<Table>
							<TableRow label="Уведомления" type="custom">
								{#if subscribed}
									<div class="flex justify-center">
										<Button color="blue" kind="small" onclick={unsubscribe}
											>Отписаться</Button
										>
									</div>
								{:else}
									<div class="flex justify-center">
										{#if showSpinner}
											<div class="flex items-center justify-center gap-2">
												<Spinner></Spinner>
												<p class="text-sm">
													Перезагрузите страницу, если загрузка идет долго
												</p>
											</div>
										{:else}
											<Button color="green" kind="small" onclick={subscribe}
												>Подписаться</Button
											>
										{/if}
									</div>
								{/if}
							</TableRow>
						</Table>
					</div>
				</Tabs>

				<!-- End Tab Nav -->
			{:else}
				<p>Пользователь не найден. Возможно, вы не вошли в систему.</p>
			{/if}
		{/await}
	</div>
</main>
<section class="banner">
	<h1 class="mb-4 text-2xl font-bold">Профиль</h1>
</section>

<section class="low-content grid grid-cols-3 gap-4">
	<div></div>
	<form class="grid w-full grid-cols-1" method="POST" action="/?/logout" use:enhance>
		<Button type="submit" kind="small" color="red">Выйти</Button>
	</form>
	<div></div>
</section>
