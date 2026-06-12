<script lang="ts">
	import { goto as gotoSvelte } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	type ButtonColor = 'blue';
	type OnclickType = MouseEventHandler<HTMLButtonElement> | null | undefined;
	type TypeType = 'button' | 'submit' | 'reset' | null | undefined;
	let {
		kind = 'normal',
		color = 'blue',
		children,
		onclick = undefined,
		goto = undefined,
		disabled = false,
		type = null,
		class: className = '',
		style: styleName = '',
	}: {
		kind?: string;
		color?: ButtonColor;
		children: Snippet;
		onclick?: OnclickType;
		goto?: string;
		disabled?: boolean;
		type?: TypeType;
		class?: string;
		style?: string;
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
		};
	};

	const colorClasses: ColorClassesObject = {
		blue: {
			bg: 'bg-blue-700',
			hover: 'hover:bg-blue-800',
			ring: 'focus:ring-blue-600',
			offset: 'focus:ring-offset-blue-300'
		},
	};
</script>

<button
	style={`${styleName}`}
	class={`
	cursor-pointer
	rounded-full
	active:scale-95
	active:ring-2
	active:ring-white/50
	${colorClasses[disabled ? 'blue' : color].bg}
	touch-none
	px-8
	py-4
	text-2xl
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
	${className}
	`}
	{onclick}
	{disabled}
	{type}
>
	{@render children()}
</button>
