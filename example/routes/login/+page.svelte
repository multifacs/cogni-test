<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();

	let mode = $state<'signIn' | 'signUp'>(form?.mode === 'signUp' ? 'signUp' : 'signIn');
</script>

<main class="auth-wrap">
	<div class="card">
		<div class="tabs">
			<button type="button" class:active={mode === 'signIn'} on:click={() => (mode = 'signIn')}>
				Вход
			</button>
			<button type="button" class:active={mode === 'signUp'} on:click={() => (mode = 'signUp')}>
				Регистрация
			</button>
		</div>

		{#if mode === 'signIn'}
			<form method="post" action="?/signIn" use:enhance>
				<label>
					Email
					<input
						type="email"
						name="email"
						value={form?.mode === 'signIn' ? (form?.email ?? '') : ''}
						required
						autocomplete="email"
					/>
				</label>
				<label>
					Пароль
					<input type="password" name="password" required autocomplete="current-password" />
				</label>
				<button class="primary" type="submit">Войти</button>
			</form>
		{:else}
			<form method="post" action="?/signUp" use:enhance>
				<label>
					Имя
					<input
						name="name"
						value={form?.mode === 'signUp' ? (form?.name ?? '') : 'Nick'}
						required
						autocomplete="name"
					/>
				</label>
				<label>
					Email
					<input
						type="email"
						name="email"
						value={form?.mode === 'signUp' ? (form?.email ?? '') : 'sh@gmail.com'}
						required
						autocomplete="email"
					/>
				</label>
				<label>
					Пароль <span class="hint">(минимум 8 символов)</span>
					<input
						type="password"
						name="password"
						minlength="8"
						required
						autocomplete="new-password"
						value="2001nikita"
					/>
				</label>
				<button class="primary" type="submit">Зарегистрироваться</button>
			</form>
		{/if}

		{#if form?.message}
			<p class="error">{form.message}</p>
		{/if}
	</div>
</main>

<style>
	.auth-wrap {
		max-width: 480px;
		margin: 60px auto;
		padding: 0 20px;
	}

	.card {
		background: rgba(255, 255, 255, 0.08);
		border-radius: 20px;
		padding: 28px;
		backdrop-filter: blur(8px);
		color: #fff;
	}

	.tabs {
		display: flex;
		gap: 8px;
		margin-bottom: 22px;
	}

	.tabs button {
		flex: 1;
		padding: 10px 14px;
		border: none;
		border-radius: 12px;
		background: transparent;
		color: #fff;
		font-weight: 600;
		font-size: 15px;
		cursor: pointer;
		transition: background 0.2s;
	}

	.tabs button.active {
		background: #fff;
		color: #0c1452;
	}

	.tabs button:hover:not(.active) {
		background: rgba(255, 255, 255, 0.1);
	}

	form {
		display: flex;
		flex-direction: column;
		gap: 14px;
	}

	label {
		display: flex;
		flex-direction: column;
		gap: 6px;
		font-size: 14px;
	}

	.hint {
		opacity: 0.7;
		font-weight: normal;
	}

	input {
		padding: 10px 12px;
		border: none;
		border-radius: 10px;
		outline: none;
		font-size: 15px;
	}

	button.primary {
		margin-top: 6px;
		padding: 12px 16px;
		border: none;
		border-radius: 12px;
		background: #4caf50;
		color: #fff;
		font-weight: 600;
		font-size: 16px;
		cursor: pointer;
		transition: transform 0.15s;
	}

	button.primary:hover {
		transform: scale(1.02);
	}

	.error {
		margin-top: 16px;
		padding: 12px 14px;
		background: rgba(255, 77, 77, 0.15);
		border: 1px solid #ff4d4d;
		border-radius: 10px;
		color: #ff7a7a;
		font-size: 14px;
		text-align: center;
	}
</style>
