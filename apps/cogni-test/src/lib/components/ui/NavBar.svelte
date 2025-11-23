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
	class="fixed bottom-0 z-50 flex w-full justify-around border-t border-gray-700 bg-gray-900 py-2 text-white"
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
