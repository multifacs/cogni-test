<script lang="ts">
	import { page } from '$app/state';

	// TODO: add icons
	const paths = [
		{
			href: '/home',
			icon: '🏠',
			text: 'Главная'
		},
		{
			href: '/admin/gto-m',
			icon: '📚',
			text: 'ГТО-М'
		},
		{
			href: '/admin/mypatients',
			icon: '📚',
			text: 'Мои пациенты'
		},
		{
			href: '/admin',
			icon: '📚',
			text: 'Уведомления'
		}
	];
</script>

<nav
	class="fixed bottom-0 z-50 flex w-full justify-around border-t border-gray-700 bg-gray-900 py-2 text-white"
>
	{#each paths as path}
		<a
			href={path.href}
			class="max-xs:text-xs flex flex-col items-center text-sm transition-colors duration-200"
			class:text-blue-400={page.url.pathname.startsWith(path.href)}
		>
			<span>{path.icon}</span>
			<span>{path.text}</span>
		</a>
	{/each}
</nav>
