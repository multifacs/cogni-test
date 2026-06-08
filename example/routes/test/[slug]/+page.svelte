<script lang="ts">
  import { page } from '$app/state';
  import { testRegistry } from '$lib/tests/testRegistry';

  let slug = $derived(page.params.slug);
  let test = $derived(testRegistry[slug]);
  let TestComponent = $state(null);

  $effect(() => {
    TestComponent = null;
    if (test) {
      test.component().then(mod => {
        TestComponent = mod.default;
      });
    }
  });
</script>

{#if TestComponent}
  <h1>{test?.title || 'Тест'}</h1>
  <p>{test?.description || 'Описание теста отсутствует.'}</p>
  <TestComponent />

{:else if !test}
  <p>Тест не найден: "{slug}"</p>
{:else}
  <p>Загрузка теста.</p>
{/if}

<style>
h1 {
		text-align: center;
		margin-bottom: 20px;
		color: white;
	}
p {
		text-align: center;
		font-size: 1.2em;
		color: white;
	}


</style>