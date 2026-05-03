<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { profileSurveyStore, userStore } from '$lib/stores/user';
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
		console.log({ ...$profileSurveyStore });
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
		{ id: 'tab3', label: '💃 Занятия' },
		{ id: 'tab4', label: '💪 Тело' },
		{ id: 'tab5', label: '⚙️ Настройки' }
	];

	function onTabChange(tab: string) {
		console.log(tab);
		activeTab = tab;
	}

	// Функция для конвертации объекта в FormData
	function toFormData(data) {
		const formData = new FormData();

		for (const [key, value] of Object.entries(data)) {
			if (value !== null && value !== undefined && value !== '') {
				// Для булевых значений конвертируем в 0/1
				if (typeof value === 'boolean') {
					formData.append(key, value ? '1' : '0');
				} else {
					formData.append(key, value.toString());
				}
			}
		}

		return formData;
	}

	async function handleSave() {

		try {
			const formDataToSend = toFormData($profileSurveyStore);

			const response = await fetch('/?/save', {
				method: 'POST',
				body: formDataToSend
			});

			if (!response.ok) {
				throw new Error('Failed to save profile data');
			}

			const result = await response.json();
			console.log('Profile saved successfully:', result);
			return result;
		} catch (err) {
			console.error('Error saving profile survey:', err);
			// error = err.message;
			throw err;
		}
	}
</script>

<main class="main grid w-full">
	<form class="flex w-full flex-col items-center justify-center">
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
								type="value"
								value={`${u.firstname} ${u.lastname}`}
							/>
							<TableRow
								label="Дата рождения"
								type="value"
								value={formatDate(u.birthday)}
							/>
							<TableRow label="Возраст" type="value" value={formatAge(u.birthday)} />
							<!-- <TableRow
								label="Пол"
								type="choice"
								options={[
									{ label: 'Мужчина', value: 'male' },
									{ label: 'Женщина', value: 'female' }
								]}
								value={u.sex}
							/> -->
							<TableRow label="Пол" type="value" value={formatSex(u.sex)} />
							<TableRow
								label="Населенный пункт, в котором вы прожили большую часть жизни"
								type="custom"
							>
								<Autocomplete bind:query={$profileSurveyStore.birthCity}
								></Autocomplete>
							</TableRow>
							<TableRow
								label="Текущее место проживания"
								type="choice"
								options={[
									{
										label: 'Столичный город (Москва или Санкт-Петербург)',
										value: 'capital'
									},
									{ label: 'Областной центр', value: 'municipality' },
									{ label: 'Районный центр', value: 'city' },
									{
										label: 'Малый город или поселок городского типа',
										value: 'town'
									},
									{ label: 'Деревня/село', value: 'village' }
								]}
								bind:value={$profileSurveyStore.currentCityType}
							></TableRow>
						</Table>
					</div>

					<div class:hidden={activeTab !== 'tab2'}>
						<Table>
							<TableRow
								label="Какое у вас образование?"
								type="choice"
								options={[
									{
										label: 'Без образования, начальное, неполное среднее',
										value: 'none'
									},
									{ label: 'Среднее общее', value: 'highschool' },
									{
										label: 'Среднее специальное – ПТУ, СПТУ, колледж',
										value: 'associate'
									},
									{
										label: 'Среднее техническое – техникум',
										value: 'vocational'
									},
									{
										label: 'Незаконченное высшее – не менее 3 курсов вуза',
										value: 'undergrad'
									},
									{
										label: 'Высшее – специалист, бакалавр, магистр',
										value: 'graduate'
									},
									{
										label: 'Высшее научное – аспирантура, кандидат или доктор наук',
										value: 'phd'
									}
								]}
								bind:value={$profileSurveyStore.education}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была работа, не требующая особой квалификации (охранник, официант, садовник, уборщик и т.д.)?"
								type="range"
								min={0}
								max={50}
								bind:value={$profileSurveyStore.yearsNotQualified}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была работа, требующая квалифицированного прикладного труда (медсестра, повар, парикмахер, слесарь и т.д.)?"
								type="range"
								min={0}
								max={50}
								bind:value={$profileSurveyStore.yearsQualifiedApplied}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была работа, требующая квалифицированного не прикладного труда (агент по недвижимости, менеджер по продажам, музыкант, руководитель небольшого коллектива)?"
								type="range"
								min={0}
								max={50}
								bind:value={$profileSurveyStore.yearsQualifiedNonApplied}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была профессиональная работа (управляющий компанией, адвокат, врач, учитель и т.д.)?"
								type="range"
								min={0}
								max={50}
								bind:value={$profileSurveyStore.yearsProfessional}
							/>
							<TableRow
								label="Сколько лет вашей основной деятельностью была высокоответственная или интеллектуальная работа (директор крупной компании, ученый, профессор, судья, хирург)?"
								type="range"
								min={0}
								max={50}
								bind:value={$profileSurveyStore.yearsHighResponsibility}
							/>
						</Table>
					</div>
					<div class:hidden={activeTab !== 'tab3'}>
						<Table>
							<TableRow
								label="Какой из предложенных ниже вариантов лучше всего описывает ваше основное занятие в настоящее время?"
								type="choice"
								options={[
									{
										label: 'Ученик средней школы, гимназии, ПТУ, профессионального училища, профессионального лицея, техникума, колледжа',
										value: 'student'
									},
									{ label: 'Студент дневного вуза', value: 'uni_student' },
									{ label: 'Работаю', value: 'employed' },
									{
										label: 'Не работаю по состоянию здоровья, инвалид',
										value: 'disabled'
									},
									{
										label: 'Веду домашнее хозяйство, ухаживаю за другими членами семьи, воспитываю детей',
										value: 'homemaker'
									},
									{ label: 'Пенсионер', value: 'retiree' },
									{ label: 'Другое', value: 'other' }
								]}
								bind:value={$profileSurveyStore.currentOccupation}
							/>
							<TableRow
								label="К какой категории можно отнести вашу должность на основном месте работы?"
								type="choice"
								options={[
									{
										label: 'Бизнесмен, предприниматель',
										value: 'business_owner'
									},
									{
										label: 'Руководитель высшего звена, управленец',
										value: 'executive'
									},
									{
										label: 'Руководитель среднего звена (мастер, бригадир, начальник отдела и др.)',
										value: 'middle_manager'
									},
									{ label: 'Военнослужащий', value: 'military' },
									{
										label: 'Сотрудник органов внутренних дел',
										value: 'law_enforcement'
									},
									{ label: 'Учитель, воспитатель', value: 'teacher' },
									{
										label: 'Сотрудник государственного и муниципального управления',
										value: 'civil_servant'
									},
									{
										label: 'Врач, работник здравоохранения',
										value: 'healthcare'
									},
									{
										label: 'Представитель творческой интеллигенции (актер, музыкант, художник и др.)',
										value: 'creative_professional'
									},
									{
										label: 'Преподаватель вуза, научный работник',
										value: 'academic'
									},
									{
										label: 'Служащий, специалист предприятия, организации',
										value: 'office_employee'
									},
									{ label: 'Рабочий', value: 'worker' },
									{ label: 'Другое', value: 'other_profession' }
								]}
								bind:value={$profileSurveyStore.jobPosition}
							/>
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
								bind:value={$profileSurveyStore.weeklyReading}
							/>
							<TableRow
								label="Домашние обязанности (приготовление пищи, стирка, покупка продуктов и т.д.)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.weeklyHousework}
							/>
							<TableRow
								label="Хобби (шахматы, танцы, вязание, коллекционирование и т.д.)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.weeklyHobby}
							/>
							<TableRow
								label="Использование современных технологий (интернет, компьютер)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.weeklyTech}
							/>
							<TableRow
								label="Укажите какими из представленных дел вы занимаетесь ежемесячно:"
								value={''}
							/>
							<TableRow
								label="Социальные мероприятия (клубы, ассоциации, собрания)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.monthlySocial}
							/>
							<TableRow
								label="Кино, театр"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.monthlyCulture}
							/>
							<TableRow
								label="Садоводство, рукоделие"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.monthlyGardening}
							/>
							<TableRow
								label="Забота о ком-то (внуки, пожилые люди)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.monthlyCaring}
							/>
							<TableRow
								label="Волонтерская работа"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.monthlyVolunteer}
							/>
							<TableRow
								label="Художественная деятельность (пение, рисование, игра на музыкальных инструментах и т.д.)"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.monthlyArtistic}
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
								bind:value={$profileSurveyStore.yearlyEvents}
							/>
							<TableRow
								label="Путешествия на несколько дней"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.yearlyTravel}
							/>
							<TableRow
								label="Чтение книг"
								type="choice"
								options={[
									{ label: 'Никогда', value: 'never' },
									{ label: 'Изредка', value: 'seldom' },
									{ label: 'Регулярно', value: 'often' }
								]}
								bind:value={$profileSurveyStore.yearlyBookReading}
							/>
						</Table>
					</div>

					<div class:hidden={activeTab !== 'tab4'}>
						<Table>
							<TableRow
								label="Рост"
								type="range"
								min={0}
								max={250}
								bind:value={$profileSurveyStore.height}
							/>
							<TableRow
								label="Вес"
								type="range"
								min={0}
								max={250}
								bind:value={$profileSurveyStore.weight}
							/>
							<TableRow
								label="Ведущая рука (какой рукой в основном пишете)"
								type="choice"
								options={[
									{ label: 'Правая', value: 'left' },
									{ label: 'Левая', value: 'right' }
								]}
								bind:value={$profileSurveyStore.dominantHand}
							/>
							<TableRow
								label="Являетесь ли вы амбидекстром?"
								type="choice"
								isBoolean={true}
								bind:value={$profileSurveyStore.isAmbidextrous}
							/>
							<!-- <TableRow label="Хронические заболевания" type="input" /> -->
							<TableRow
								label="Хронические заболевания"
								type="custom-choice"
								bind:value={$profileSurveyStore.chronicDiseases}
							/>
							<TableRow
								label="Курение"
								type="choice"
								options={[
									{ label: 'Нет', value: 'no' },
									{ label: 'Да', value: 'yes' },
									{ label: 'Было', value: 'usedTo' }
								]}
								bind:value={$profileSurveyStore.smoking}
							/>
							<TableRow
								label="Алкоголь"
								type="choice"
								options={[
									{ label: 'Нет', value: 'no' },
									{ label: 'Да (1+ в неделю)', value: 'yes' }
								]}
								bind:value={$profileSurveyStore.alcohol}
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
								bind:value={$profileSurveyStore.sports}
							/>
							<TableRow
								label="Занимаетесь ли киберспортом или являетесь геймером?"
								type="choice"
								isBoolean={true}
								bind:value={$profileSurveyStore.isGamer}
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
	</form>
</main>
<section class="banner">
	<h1 class="mb-4 text-2xl font-bold">Профиль</h1>
</section>

<section class="low-content grid grid-cols-4 gap-4">
	<div></div>
	<form class="" method="POST" action="/?/logout" use:enhance>
		<Button class="w-full" type="submit" kind="small" color="red">Выйти</Button>
	</form>
	<Button kind="small" color="green" onclick={handleSave}>Сохранить</Button>
	<div></div>
</section>
