export async function load({ fetch }) {
    const response = await fetch('/words'); // Путь к файлу
    const text = await response.text();
    const words = text
        .split('\n');
    console.log(words);
    return {
        words
    }
};
