<script lang="ts">
	import { goto as gotoSvelte } from '$app/navigation';
	import { resolve } from '$app/paths';
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
		| 'rose'
		| 'cream';
	type OnclickType = MouseEventHandler<HTMLButtonElement> | null | undefined;
	type TypeType = 'button' | 'submit' | 'reset' | null | undefined;
	let {
		id,
		kind = 'normal',
		color = 'green',
		children,
		onclick = undefined,
		goto = undefined,
		disabled = false,
		type = null,
		class: className = '',
		style: styleName = ''
	}: {
		id?: string;
		kind?: string;
		color: ButtonColor;
		children: Snippet;
		onclick?: OnclickType;
		goto?: string;
		disabled?: boolean;
		type?: TypeType;
		class?: string;
		style?: string;
	} = $props();

	let resolvedOnclick = $derived(
		goto
			? () => {
					gotoSvelte(resolve(goto));
				}
			: onclick
	);

	type ColorClassesObject = {
		[key in ButtonColor]: {
			bg: string;
			hover: string;
			ring: string;
			offset: string;
			text: string;
		};
	};

	const colorClasses: ColorClassesObject = {
		red: {
			bg: 'bg-red-700',
			hover: 'hover:bg-red-800',
			ring: 'focus:ring-red-600',
			offset: 'focus:ring-offset-red-300',
			text: 'text-white'
		},
		blue: {
			bg: 'bg-blue-700',
			hover: 'hover:bg-blue-800',
			ring: 'focus:ring-blue-600',
			offset: 'focus:ring-offset-blue-300',
			text: 'text-white'
		},
		green: {
			bg: 'bg-green-700',
			hover: 'hover:bg-green-800',
			ring: 'focus:ring-green-600',
			offset: 'focus:ring-offset-green-300',
			text: 'text-white'
		},
		gray: {
			bg: 'bg-gray-700',
			hover: 'hover:bg-gray-800',
			ring: 'focus:ring-gray-600',
			offset: 'focus:ring-offset-gray-300',
			text: 'text-white'
		},
		yellow: {
			bg: 'bg-yellow-600',
			hover: 'hover:bg-yellow-700',
			ring: 'focus:ring-yellow-500',
			offset: 'focus:ring-offset-yellow-300',
			text: 'text-white'
		},
		purple: {
			bg: 'bg-purple-700',
			hover: 'hover:bg-purple-800',
			ring: 'focus:ring-purple-600',
			offset: 'focus:ring-offset-purple-300',
			text: 'text-white'
		},
		pink: {
			bg: 'bg-pink-700',
			hover: 'hover:bg-pink-800',
			ring: 'focus:ring-pink-600',
			offset: 'focus:ring-offset-pink-300',
			text: 'text-white'
		},
		indigo: {
			bg: 'bg-indigo-700',
			hover: 'hover:bg-indigo-800',
			ring: 'focus:ring-indigo-600',
			offset: 'focus:ring-offset-indigo-300',
			text: 'text-white'
		},
		teal: {
			bg: 'bg-teal-700',
			hover: 'hover:bg-teal-800',
			ring: 'focus:ring-teal-600',
			offset: 'focus:ring-offset-teal-300',
			text: 'text-white'
		},
		orange: {
			bg: 'bg-orange-700',
			hover: 'hover:bg-orange-800',
			ring: 'focus:ring-orange-600',
			offset: 'focus:ring-offset-orange-300',
			text: 'text-white'
		},
		cyan: {
			bg: 'bg-cyan-700',
			hover: 'hover:bg-cyan-800',
			ring: 'focus:ring-cyan-600',
			offset: 'focus:ring-offset-cyan-300',
			text: 'text-white'
		},
		lime: {
			bg: 'bg-lime-700',
			hover: 'hover:bg-lime-800',
			ring: 'focus:ring-lime-600',
			offset: 'focus:ring-offset-lime-300',
			text: 'text-white'
		},
		amber: {
			bg: 'bg-amber-700',
			hover: 'hover:bg-amber-800',
			ring: 'focus:ring-amber-600',
			offset: 'focus:ring-offset-amber-300',
			text: 'text-white'
		},
		emerald: {
			bg: 'bg-emerald-700',
			hover: 'hover:bg-emerald-800',
			ring: 'focus:ring-emerald-600',
			offset: 'focus:ring-offset-emerald-300',
			text: 'text-white'
		},
		sky: {
			bg: 'bg-sky-700',
			hover: 'hover:bg-sky-800',
			ring: 'focus:ring-sky-600',
			offset: 'focus:ring-offset-sky-300',
			text: 'text-white'
		},
		violet: {
			bg: 'bg-violet-700',
			hover: 'hover:bg-violet-800',
			ring: 'focus:ring-violet-600',
			offset: 'focus:ring-offset-violet-300',
			text: 'text-white'
		},
		fuchsia: {
			bg: 'bg-fuchsia-700',
			hover: 'hover:bg-fuchsia-800',
			ring: 'focus:ring-fuchsia-600',
			offset: 'focus:ring-offset-fuchsia-300',
			text: 'text-white'
		},
		rose: {
			bg: 'bg-rose-700',
			hover: 'hover:bg-rose-800',
			ring: 'focus:ring-rose-600',
			offset: 'focus:ring-offset-rose-300',
			text: 'text-white'
		},
		cream: {
			bg: 'bg-stone-50',
			hover: 'hover:bg-stone-100',
			ring: 'focus:ring-stone-200',
			offset: 'focus:ring-offset-stone-100',
			text: 'text-stone-900'
		}
	};
</script>

<button
	id={`${id}`}
	style={`${styleName}`}
	class={`
	cursor-pointer
	active:scale-95
	active:ring-2
	active:ring-white/50
	${colorClasses[disabled ? 'gray' : color].bg}
	touch-none
	${colorClasses[color].text}
	transition
	duration-200
	ease-in
	select-none
	${colorClasses[color].hover}
	focus:ring-2
	${colorClasses[color].ring}
	focus:ring-offset-2
	${colorClasses[color].offset}
	${className}
	items-center
	gap-x-2
	rounded-lg
	px-4
	py-3
	text-center
	text-sm
	font-medium
	focus:outline-hidden
	disabled:pointer-events-none
	disabled:opacity-50
	max-md:py-2
	`}
	onclick={resolvedOnclick}
	{disabled}
	{type}
>
	{@render children()}
</button>
