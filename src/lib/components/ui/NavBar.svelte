<script lang="ts">
	import { page } from '$app/state';

	const paths = [
		{
			href: '/home',
			icon: '/nav_icons/home.svg',
			text: 'Главная'
		},
		{
			href: '/exercises',
			icon: '/nav_icons/exercises.svg',
			text: 'Тренажер'
		},

		// {
		// 	href: '/tests',
		// 	icon: '/nav_icons/home.svg',
		// 	text: 'Тесты'
		// },
		// {
		// 	href: '/gto',
		// 	icon: '/nav_icons/home.svg',
		// 	text: 'ГТО-М'
		// },
		{
			href: '/materials',
			icon: '/nav_icons/materials.svg',
			text: 'Статьи'
		},
		{
			href: '/profile',
			icon: '/nav_icons/profile.svg',
			text: 'Профиль'
		}
	];
</script>

<nav class="nav flex w-full justify-around">
	{#each paths as path}
		<a
			href={path.href}
			class="max-xs:text-xs flex flex-col items-center text-sm transition-colors duration-200"
			class:text-blue-400={page.url.pathname.startsWith(path.href)}
		>
			<img src={path.icon} />
			<h4>{path.text}</h4>
		</a>
	{/each}
</nav>

<style>
	.nav {
		grid-area: nav;
		background-color: #fff;
		padding: 0.5rem;
		text-align: center;
		align-items: center;
		display: flex;
	}

	@media (min-width: 1024px) {
		.nav {
			flex-direction: column;
			justify-content: start;
			padding-top: 100%;
			gap: 10%;
		}
	}
</style>
