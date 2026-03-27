<script lang="ts">
	import { page } from '$app/state';

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
			href: '/exercises',
			icon: '📊',
			text: 'Тренажер'
		},
		{
			href: '/materials',
			icon: '📚',
			text: 'Долголетие'
		},
		{
			href: '/profile',
			icon: '⚙️',
			text: 'Профиль'
		}
	];
</script>

<nav
	class="flex w-full justify-around text-white"
>
	{#each paths as path}
		<a
			href={path.href}
			class="flex flex-col items-center text-sm transition-colors duration-200 max-xs:text-xs"
			class:text-blue-400={page.url.pathname.startsWith(path.href)}
		>
			<span>{path.icon}</span>
			<span>{path.text}</span>
		</a>
	{/each}
</nav>
