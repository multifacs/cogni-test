<script lang="ts">
	import { page } from '$app/state';

	let { undiagnosed, allowedPaths } = $props();

	const paths = [
		{
			href: '/home',
			icon: '🏠',
			text: 'Главная'
		},
		{
			href: '/tests',
			icon: '🧪',
			text: 'Возраст'
		},
		{
			href: '/gto',
			icon: '🏆',
			text: 'ГТО-М'
		},
		{
			href: '/exercises',
			icon: '📊',
			text: 'Тренажер'
		},
		{
			href: '/profile',
			icon: '⚙️',
			text: 'Профиль'
		}
	];

	function isAllowed(href: string) {
		return undiagnosed && allowedPaths.includes(href);
	}
</script>

<nav class="flex w-full justify-around text-white">
	{#each paths as path}
		<a
			href={path.href}
			class={[
				'flex',
				'flex-col',
				'items-center',
				'text-sm',
				'transition-colors',
				'duration-200',
				'max-xs:text-xs'
			]}
			class:text-blue-400={page.url.pathname.startsWith(path.href)}
			class:pointer-events-none={!isAllowed(path.href)}
			class:cursor-not-allowed={!isAllowed(path.href)}
			class:grayscale={!isAllowed(path.href)}
		>
			<span>{path.icon}</span>
			<span>{path.text}</span>
		</a>
	{/each}
</nav>
