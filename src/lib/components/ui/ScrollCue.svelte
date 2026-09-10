<script lang="ts">
	import { onMount } from 'svelte';
	import { afterNavigate } from '$app/navigation';

	type Side = 'down' | 'up';

	let { side }: { side: Side } = $props();

	let visible = $state(false);
	let btn: HTMLButtonElement | null = null;
	let root: HTMLElement | null = null;

	const THRESHOLD = 8; // px from the edge before the cue appears/disappears
	const MARGIN = 16; // gap between the cue and the container edge

	function computeVisible(el: HTMLElement) {
		const max = el.scrollHeight - el.clientHeight;
		if (max <= THRESHOLD) return false;
		if (side === 'down') {
			return el.scrollTop < max - THRESHOLD;
		}
		return el.scrollTop > THRESHOLD;
	}

	function findRoot(): HTMLElement | null {
		const main = document.querySelector<HTMLElement>('main.main, .main');
		if (main && main.scrollHeight > main.clientHeight) return main;
		// stand-alone pages (e.g. /consent) scroll in their own <section>
		for (const el of document.querySelectorAll<HTMLElement>('section, main')) {
			if (el.scrollHeight > el.clientHeight) return el;
		}
		return null;
	}

	function update() {
		if (!root) {
			root = findRoot();
		}
		visible = root ? computeVisible(root) : false;
		if (root && btn) {
			// anchor to the live bounds of the scroll container,
			// so the cue adapts to the mobile bottom bar / desktop side nav
			const rect = root.getBoundingClientRect();
			if (side === 'down') {
				setStyle('top', 'auto');
				setStyle('bottom', `${window.innerHeight - rect.bottom + MARGIN}px`);
			} else {
				setStyle('bottom', 'auto');
				setStyle('top', `${rect.top + MARGIN}px`);
			}
			// the classic desktop scrollbar (Chrome/Windows) sits inside the
			// container's border box — measure it and keep the cue clear of it
			const scrollbar = root.offsetWidth - root.clientWidth;
			setStyle(
				'right',
				`${document.documentElement.clientWidth - rect.right + scrollbar + MARGIN}px`
			);
		}
	}

	// only touch the DOM when the value actually changed — repeated writes
	// would trip the MutationObserver below in an endless rAF loop
	const lastStyles: Record<string, string> = {};
	function setStyle(prop: string, value: string) {
		if (lastStyles[prop] === value) return;
		lastStyles[prop] = value;
		btn!.style.setProperty(prop, value);
	}

	function scroll() {
		if (!root) return;
		root.scrollTo({
			top: side === 'down' ? root.scrollHeight : 0,
			behavior: 'smooth'
		});
	}

	onMount(() => {
		update();
		// scroll doesn't bubble, but capture catches it from any container
		document.addEventListener('scroll', update, true);
		window.addEventListener('resize', update);

		// content often arrives after mount (async data, images, fonts):
		// none of the events above fire, so the cue would never show up.
		// Watch for DOM changes and re-check on a rAF-throttled schedule.
		const mo = new MutationObserver(requestUpdate);
		mo.observe(document.body, { childList: true, subtree: true, characterData: true });
		// late-loading <img> don't mutate the DOM — catch their load event
		document.addEventListener('load', requestUpdate, true);
		// web fonts change text metrics → scrollHeight
		document.fonts?.ready.then(() => requestUpdate());

		return () => {
			document.removeEventListener('scroll', update, true);
			window.removeEventListener('resize', update);
			mo.disconnect();
			document.removeEventListener('load', requestUpdate, true);
		};
	});

	// rAF-throttle: coalesce bursts of mutations into one measurement pass
	let raf = 0;
	function requestUpdate() {
		if (raf) return;
		raf = requestAnimationFrame(() => {
			raf = 0;
			update();
		});
	}

	// .main is re-rendered by each page — rebind after navigation
	afterNavigate(() => {
		root = null;
		update();
	});
</script>

<button
	bind:this={btn}
	class="cue cue-{side}"
	class:visible
	onclick={scroll}
	aria-label={side === 'down' ? 'Прокрутить вниз' : 'Прокрутить вверх'}
	tabindex={visible ? 0 : -1}
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		width="24"
		height="24"
		viewBox="0 0 24 24"
		fill="none"
		stroke="#2C3E50"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		<path d="M6 9l6 6 6-6" />
	</svg>
</button>

<style>
	.cue {
		position: fixed;
		width: 2.5rem;
		height: 2.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0;
		background: #fff;
		border: 1px solid #e2e8f0;
		border-radius: 9999px;
		box-shadow: 0 4px 12px rgb(44 62 80 / 0.15);
		cursor: pointer;
		z-index: 40;
		opacity: 0;
		pointer-events: none;
		transition:
			opacity 0.25s ease,
			background-color 0.2s ease,
			box-shadow 0.2s ease;
	}

	.cue.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.cue.visible:hover {
		background: #f1f5f9;
		box-shadow: 0 4px 16px rgb(44 62 80 / 0.25);
	}

	.cue:focus-visible {
		outline: 2px solid #d48c7a;
		outline-offset: 2px;
	}

	.cue-up svg {
		transform: rotate(180deg);
	}
</style>
