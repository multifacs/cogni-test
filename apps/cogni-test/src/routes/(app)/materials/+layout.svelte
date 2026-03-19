<script lang="ts">
    import type { LayoutProps } from './$types';

    let { data, children }: LayoutProps = $props();
</script>



{@render children()}
<section class="low-content gap-5"></section>
