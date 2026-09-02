<script lang="ts">
	import { page } from '$app/state';

	let { undiagnosed, allowedPaths } = $props();

	const paths = [
		{
			href: '/home',
			icon: '/nav_icons/home.svg',
			text: 'Главная'
		},
		{
			href: '/tests',
			icon: '/brain.svg',
			text: 'Возраст'
		},
		{
			href: '/exercises',
			icon: '/nav_icons/exercises.svg',
			text: 'Тренажер'
		},
		{
			href: '/gto',
			icon: '/nav_icons/materials.svg',
			text: 'ГТО-М'
		},
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

	function isAllowed(href: string) {
		return !undiagnosed || allowedPaths.includes(href);
	}

	function isActive(href: string): boolean {
		if (href === '/home') {
			return page.url.pathname === href || page.url.pathname === '/';
		}
		return page.url.pathname.startsWith(href);
	}
</script>

<nav class="nav">
	{#each paths as path}
		<a
			href={path.href}
			class="nav-link"
			class:active={isActive(path.href)}
			class:pointer-events-none={!isAllowed(path.href)}
			class:cursor-not-allowed={!isAllowed(path.href)}
			class:grayscale={!isAllowed(path.href)}
		>
			<img src={path.icon} alt={path.text} />
			<h4 class="nav-text">{path.text}</h4>
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
		justify-content: space-around;
		width: 100%;
	}

	.nav-link {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-decoration: none;
	}

	.nav-link img {
		width: 1.5rem;
		height: 1.5rem;
	}

	.nav-text {
		margin: 0;
	}

	.nav-link.active .nav-text {
		color: #d48c7a;
		font-weight: bolder;
	}

	.nav-link.active img {
		opacity: 1;
		filter: brightness(0) saturate(100%) invert(67%) sepia(18%) saturate(1048%)
			hue-rotate(325deg) brightness(95%) contrast(92%);
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
