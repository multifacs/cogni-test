<script lang="ts">
	import { goto as gotoSvelte } from '$app/navigation';
	import type { Snippet } from 'svelte';
	import type { MouseEventHandler } from 'svelte/elements';

	type ButtonColor = 'red' | 'blue' | 'green';
	type OnclickType = MouseEventHandler<HTMLButtonElement> | null | undefined;
	type TypeType = 'button' | 'submit' | 'reset' | null | undefined;
	let {
		kind = 'normal',
		color = 'green',
		children,
		onclick = undefined,
		goto = undefined,
		disabled = false,
		type = null
	}: {
		kind?: string;
		color: ButtonColor;
		children: Snippet;
		onclick?: OnclickType;
		goto?: string;
		disabled?: boolean;
		type?: TypeType;
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
		red: {
			bg: 'bg-red-700',
			hover: 'hover:bg-red-800',
			ring: 'focus:ring-red-600',
			offset: 'focus:ring-offset-red-300'
		},
		blue: {
			bg: 'bg-blue-700',
			hover: 'hover:bg-blue-800',
			ring: 'focus:ring-blue-600',
			offset: 'focus:ring-offset-blue-300'
		},
		green: {
			bg: 'bg-green-700',
			hover: 'hover:bg-green-800',
			ring: 'focus:ring-green-600',
			offset: 'focus:ring-offset-green-300'
		}
	};
</script>

<button
	class={`
	cursor-pointer
	rounded-full
	${colorClasses[color].bg}
	px-4
	py-2
	text-center
	text-base
	text-white
	shadow-md
	transition
	duration-200
	ease-in
	${colorClasses[color].hover}
	focus:ring-2
	${colorClasses[color].ring}
	focus:ring-offset-2
	${colorClasses[color].offset}
	focus:outline-none`}
	{onclick}
	{disabled}
	{type}
>
	{@render children()}
</button>

<style>
	/* .button {
		touch-action: manipulation;
		user-select: none;
	} */

	.normal {
		font-size: 16px;
		padding: 10px 20px;
	}

	.big {
		padding: 10px 20px;
		margin: 5px;
		width: 80px;
		height: 60px;
	}

	.small {
		width: 80px;
		padding: 5px;
		color: #fff;
		border: none;
		border-radius: 5px;
		font-size: 16px;
		cursor: pointer;
	}
</style>
