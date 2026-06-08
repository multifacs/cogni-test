    <!-- Основной контент страницы -->
<script>
    import { testRegistry } from "$lib/tests/testRegistry";
    import { resolve } from '$app/paths';
</script>

<main class="content">
    <h1>Добро пожаловать!</h1>
    <p>Выберите тест:</p>

    <div class="grid-container">
        <!-- <a class="test" href={resolve('/attention')}>Тест Внимание</a> -->
    
        {#each Object.entries(testRegistry) as [slug, test] (slug)}
        <a href={resolve(`/test/${slug}`)} class="test">{test.title}<p>{test.description}</p></a>
       
        {/each}
    </div>
</main>


<style>
    
/* Стили для основного содержимого */
.content {
    max-width: 1200px;
    margin: 40px auto;
    padding: 0 20px;
    text-align: center;
}

.content h1 {
    color: white;
    margin-bottom: 20px;
}

.content p {
    color: white;
    font-size: 30px;
    line-height: 1.5;
}

.grid-container {
  

    display: grid;
    gap: 1em;
    justify-content: center;
    /* margin: 50px auto; */
    align-content: center;
    /* width: auto; */
    margin-top: 20px;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    /* grid-template-columns: 1fr 1fr 1fr; */    
}

.grid-container .test {
    background-color: #4a5565;
    padding: 2em;
    border-radius: 8px;
    color: white;
    text-decoration: none;
    cursor: pointer;
    transition: background-color 0.3s ease;

    font-weight:600;
    display: flex;
    /* flex-grow: 1; */
    flex-direction: column;
    justify-content: center;  
    align-items: center;    
    text-align: center;    
}

.grid-container p {
    font-weight:500;
    color: white;
    font-size: 0.8em;
    line-height: 1.5;
}

.test:hover {
    background-color: #555;
}
</style>