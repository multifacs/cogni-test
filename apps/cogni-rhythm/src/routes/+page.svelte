<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	import { userManager } from '$lib/userStore';

	import Button from '$lib/components/ui/Button.svelte';
	import DateInput from '$lib/components/ui/login-form/DateInput.svelte';
	import TextInput from '$lib/components/ui/login-form/TextInput.svelte';
	import PasswordInput from '$lib/components/ui/login-form/PasswordInput.svelte';

	import { PUBLIC_PASSWORD } from '$env/static/public';

	let firstname = $state('');
	let lastname = $state('');
	let birthdate = $state('31.01.2001');
	let sex = $state<'male' | 'female'>('male');
	let password = $state('');

	let firstnameError = $state('');
	let lastnameError = $state('');
	let dateError = $state('');

	// по умолчанию галочка стоит
	let consentChecked = $state(true);

	function isSubmitDisabled() {
		return (
			// !firstname ||
			// !lastname ||
			// firstnameError.length > 0 ||
			// lastnameError.length > 0 ||
			dateError.length > 0 || !consentChecked
		);
	}

	const hashedSecurePassword = PUBLIC_PASSWORD || 261180;

	async function handleSubmit() {
		const userId = crypto.randomUUID();
		const user = {
			id: userId,
			// firstname: firstname,
			// lastname: lastname,
			birthdate: birthdate,
			sex: sex
		};

		if (password != hashedSecurePassword) {
			alert('Неверный пароль');
			console.log(hashedSecurePassword)
			return;
		}

		const success = await userManager.login(user);
		if (success) {
			goto('/about');
		} else {
			alert('Ошибка входа');
		}
	}

	onMount(async () => {
		const authed = await userManager.checkAuth();
		if (authed) {
			goto('/about');
		}
	});
</script>

<form
	class="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-3xl bg-gray-700 p-6 text-white shadow-xl"
	onsubmit={handleSubmit}
>
	<h1 class="mb-2 text-center text-2xl font-bold">Вход</h1>

	<!-- <div class="flex flex-col gap-1">
		<label for="firstname">🧍 Имя</label>
		<TextInput
			required
			name="firstname"
			bind:value={firstname}
			bind:errorMessage={firstnameError}
		/>
	</div>

	<div class="flex flex-col gap-1">
		<label for="lastname">🔠 Первые 2 буквы фамилии</label>
		<TextInput required name="lastname" bind:value={lastname} bind:errorMessage={lastnameError} />
	</div> -->

	<div class="flex flex-col gap-1">
		<label for="birthday">🎂 Дата рождения</label>
		<DateInput required name="birthday" bind:value={birthdate} bind:errorMessage={dateError} />
	</div>

	<div class="flex items-center justify-between gap-2 text-sm">
		<label for="sex">👫 Пол</label>
		<label><input type="radio" name="sex" bind:group={sex} value="male" /> Мужской</label>
		<label><input type="radio" name="sex" bind:group={sex} value="female" /> Женский</label>
	</div>

	<div>
		<label for="password">🔑 Код</label>
		<PasswordInput required name="password" bind:value={password} placeholder="Код" />
	</div>

	<!-- чекбокс согласия -->
	<div class="mt-3 flex items-center gap-2 text-sm">
		<input
			id="consent"
			type="checkbox"
			class="h-4 w-4"
			name="consent"
			value="true"
			required
			bind:checked={consentChecked}
		/>
		<label for="consent" class="select-none">
			Согласен(а) на
			<a href="/consent" class="underline hover:opacity-80" target="_blank">
				обработку персональных данных
			</a>
		</label>
	</div>
	<Button type="submit" color="green" disabled={isSubmitDisabled()}>Войти</Button>
</form>
