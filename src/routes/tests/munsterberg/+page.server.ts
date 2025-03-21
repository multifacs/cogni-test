export async function load({ fetch }) {
    const response = await fetch('/words'); // Путь к файлу
    const text = await response.text();
    const words = text
        .split('\n')
        .map(x => x.split('\t')[0])
        .filter(x => x.length <= 7);
    console.log(words);
    return {
        words
    }
};
