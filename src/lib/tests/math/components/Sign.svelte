<script lang="ts">
	import type { Sign } from '../types';

	let { sign }: { sign: Sign | null } = $props();

	const effectiveSign = $derived(sign ?? '!=');
</script>

<span class={`w-8 invert-100 ${effectiveSign ? 'block' : 'hidden'}`}>{effectiveSign}</span>
