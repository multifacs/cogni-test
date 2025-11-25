<script lang="ts">
	import { goto as gotoSvelte } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	type ButtonColor =
		| 'red'
		| 'blue'
		| 'green'
		| 'gray'
		| 'yellow'
		| 'purple'
		| 'pink'
		| 'indigo'
		| 'teal'
		| 'orange'
		| 'cyan'
		| 'lime'
		| 'amber'
		| 'emerald'
		| 'sky'
		| 'violet'
		| 'fuchsia'
		| 'rose';
	type OnclickType = MouseEventHandler<HTMLButtonElement> | null | undefined;
	type TypeType = 'button' | 'submit' | 'reset' | null | undefined;
	let {
		kind = 'normal',
		color = 'green',
		children,
		onclick = undefined,
		goto = undefined,
		disabled = false,
		type = null,
		class: className = ''
	}: {
		kind?: string;
		color: ButtonColor;
		children: Snippet;
		onclick?: OnclickType;
		goto?: string;
		disabled?: boolean;
		type?: TypeType;
		class?: string;
	} = $props();

	if (goto) {
		onclick = () => {
			gotoSvelte(goto);
		};
	}

	type ColorClassesObject = {
		[key in ButtonColor]: {
			bg: string;
			hover: string;
			ring: string;
			offset: string;
			shadow?: string;
		};
	};

	const colorClasses: ColorClassesObject = {
		red: {
			bg: 'bg-gradient-to-b from-red-500 to-red-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-red-600',
			offset: 'focus:ring-offset-red-300',
			shadow: 'shadow-red-500/20'
		},
		blue: {
			bg: 'bg-gradient-to-b from-blue-500 to-blue-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-blue-600',
			offset: 'focus:ring-offset-blue-300',
			shadow: 'shadow-blue-500/20'
		},
		green: {
			bg: 'bg-gradient-to-b from-green-500 to-green-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-green-600',
			offset: 'focus:ring-offset-green-300',
			shadow: 'shadow-green-500/20'
		},
		gray: {
			bg: 'bg-gradient-to-b from-gray-500 to-gray-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-gray-600',
			offset: 'focus:ring-offset-gray-300',
			shadow: 'shadow-gray-500/20'
		},
		yellow: {
			bg: 'bg-gradient-to-b from-yellow-400 to-yellow-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-yellow-500',
			offset: 'focus:ring-offset-yellow-300',
			shadow: 'shadow-yellow-400/20'
		},
		purple: {
			bg: 'bg-gradient-to-b from-purple-500 to-purple-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-purple-600',
			offset: 'focus:ring-offset-purple-300',
			shadow: 'shadow-purple-500/20'
		},
		pink: {
			bg: 'bg-gradient-to-b from-pink-500 to-pink-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-pink-600',
			offset: 'focus:ring-offset-pink-300',
			shadow: 'shadow-pink-500/20'
		},
		indigo: {
			bg: 'bg-gradient-to-b from-indigo-500 to-indigo-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-indigo-600',
			offset: 'focus:ring-offset-indigo-300',
			shadow: 'shadow-indigo-500/20'
		},
		teal: {
			bg: 'bg-gradient-to-b from-teal-500 to-teal-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-teal-600',
			offset: 'focus:ring-offset-teal-300',
			shadow: 'shadow-teal-500/20'
		},
		orange: {
			bg: 'bg-gradient-to-b from-orange-500 to-orange-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-orange-600',
			offset: 'focus:ring-offset-orange-300',
			shadow: 'shadow-orange-500/20'
		},
		cyan: {
			bg: 'bg-gradient-to-b from-cyan-500 to-cyan-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-cyan-600',
			offset: 'focus:ring-offset-cyan-300',
			shadow: 'shadow-cyan-500/20'
		},
		lime: {
			bg: 'bg-gradient-to-b from-lime-500 to-lime-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-lime-600',
			offset: 'focus:ring-offset-lime-300',
			shadow: 'shadow-lime-500/20'
		},
		amber: {
			bg: 'bg-gradient-to-b from-amber-500 to-amber-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-amber-600',
			offset: 'focus:ring-offset-amber-300',
			shadow: 'shadow-amber-500/20'
		},
		emerald: {
			bg: 'bg-gradient-to-b from-emerald-500 to-emerald-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-emerald-600',
			offset: 'focus:ring-offset-emerald-300',
			shadow: 'shadow-emerald-500/20'
		},
		sky: {
			bg: 'bg-gradient-to-b from-sky-500 to-sky-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-sky-600',
			offset: 'focus:ring-offset-sky-300',
			shadow: 'shadow-sky-500/20'
		},
		violet: {
			bg: 'bg-gradient-to-b from-violet-500 to-violet-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-violet-600',
			offset: 'focus:ring-offset-violet-300',
			shadow: 'shadow-violet-500/20'
		},
		fuchsia: {
			bg: 'bg-gradient-to-b from-fuchsia-500 to-fuchsia-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-fuchsia-600',
			offset: 'focus:ring-offset-fuchsia-300',
			shadow: 'shadow-fuchsia-500/20'
		},
		rose: {
			bg: 'bg-gradient-to-b from-rose-500 to-rose-600',
			hover: 'hover:brightness-110',
			ring: 'focus:ring-rose-600',
			offset: 'focus:ring-offset-rose-300',
			shadow: 'shadow-rose-500/20'
		}
	};
</script>

<button
	class={`
	contrast-100
	cursor-pointer
	rounded-full
	active:scale-95
	active:ring-2
	active:ring-white/20
	${colorClasses[disabled ? 'gray' : color].bg}
	max-xs:text-xs
	xs:text-base
	xs:max-lg:landscape:text-xs
	touch-none
	px-4
	py-2
	text-center
	text-white
	shadow-md
	transition
	duration-200
	ease-in
	select-none
	${colorClasses[color].hover}
	focus:ring-2
	${colorClasses[color].ring}
	focus:ring-offset-2
	${colorClasses[color].offset}
	focus:outline-none
	${colorClasses[color].shadow}
	${className}
	`}
	{onclick}
	{disabled}
	{type}
>
	{@render children()}
</button>
