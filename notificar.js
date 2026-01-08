const fs = require('fs');

// Configurações
const FILE_PATH = './manga.js'; 
const CACHE_FILE = './manga_cache.json';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function extrairMangas() {
    const content = fs.readFileSync(FILE_PATH, 'utf8');
    // Regex para pegar o objeto dentro do array de mangás
    // Assume que seus mangás estão formatados como objetos { id: ..., title: ..., chapters: ... }
    const match = content.match(/const\s+mangas\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return null;
    
    // Transforma o texto em objeto real para manipular via código
    // Usamos o eval de forma controlada pois é um arquivo JS de dados
    try {
        return eval(match[1]);
    } catch (e) {
        console.error("Erro ao processar o array de mangás:", e);
        return null;
    }
}

async function dispararWebhook(manga, msgContent, subTitle) {
    const payload = {
        username: manga.title,
        avatar_url: manga.coverUrl,
        content: `@everyone ${msgContent}`,
        embeds: [{
            title: subTitle,
            url: `https://mangatachi.vercel.app/#/manga/${manga.id}`,
            color: 16753920,
            image: { url: manga.coverUrl },
            footer: { text: "Mangatachi Atualizações Automatizadas" },
            timestamp: new Date()
        }]
    };

    await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function principal() {
    const mangasAtuais = extrairMangas();
    if (!mangasAtuais) return;

    let cache = [];
    if (fs.existsSync(CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }

    for (const manga of mangasAtuais) {
        const mangaNoCache = cache.find(m => m.id === manga.id);

        if (!mangaNoCache) {
            // CASO 1: Mangá novo que não existia no cache
            console.log(`Novo mangá detectado: ${manga.title}`);
            await dispararWebhook(manga, "📖 **NOVO MANGÁ ADICIONADO!**", `Venha ler ${manga.title} agora!`);
        } else {
            // CASO 2: Mangá já existia, verificar se o número de capítulos aumentou
            const capsAtuais = Object.keys(manga.chapters || {}).length;
            const capsCache = Object.keys(mangaNoCache.chapters || {}).length;

            if (capsAtuais > capsCache) {
                const ultCap = Object.keys(manga.chapters).pop();
                console.log(`Novo capítulo para ${manga.title}: ${ultCap}`);
                await dispararWebhook(manga, "🚀 **NOVO CAPÍTULO DISPONÍVEL!**", `${manga.title} - Capítulo ${ultCap}`);
            }
        }
    }

    // Atualiza o cache para a próxima execução
    fs.writeFileSync(CACHE_FILE, JSON.stringify(mangasAtuais));
}

principal();
