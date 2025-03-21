export async function load({ fetch, cookies }) {
    const response = await fetch('/words'); // Путь к файлу
    const text = await response.text();
    let words = text
        .split('\n')
        .map(x => x.split('\t')[0])
        .filter(x => x.length <= 9);

    const gosha = cookies.get('gosha');
    if (gosha) {
        const response2 = await fetch('/goshas_dict.txt');
        const text2 = await response2.text();
        words = text2
            .split('\n')
            .map(x => x.toLowerCase().trim())
            .filter(x => x.length <= 7);
    }
    return {
        words
    }
};
