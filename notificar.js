const fs = require('fs');

const FILE_PATH = './manga.js'; 
const CACHE_FILE = './manga_cache.json';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function extrairMangas() {
    try {
        const content = fs.readFileSync(FILE_PATH, 'utf8');
        const match = content.match(/const\s+mangas\s*=\s*(\[[\s\S]*?\]);/);
        if (!match) return null;
        return eval(match[1]);
    } catch (e) {
        console.error("Erro ao ler manga.js:", e.message);
        return null;
    }
}

async function enviarDiscord(manga, tipo, infoExtra = {}) {
    let embed = {
        url: `https://mangatachi.vercel.app/#/manga/${manga.id}`,
        color: tipo === 'novo_manga' ? 15277667 : 5763719, // Rosa para novo, Verde para capítulo
        image: { url: manga.coverUrl },
        timestamp: new Date(),
        footer: { text: "Mangatachi Reader • Atualização Automática", icon_url: "https://i.imgur.com/your-logo.png" }
    };

    if (tipo === 'novo_manga') {
        embed.title = `✨ NOVO MANGÁ ADICIONADO: ${manga.title}`;
        embed.description = `> ${manga.description.substring(0, 150)}...`;
        embed.fields = [
            { name: "✍️ Autor", value: manga.author, inline: true },
            { name: "🏷️ Gêneros", value: manga.genres.join(", "), inline: true },
            { name: "🛡️ Equipe", value: manga.translationTeam || "Desconhecida", inline: true }
        ];
    } else {
        embed.title = `🚀 NOVO CAPÍTULO: ${manga.title}`;
        embed.description = `O capítulo **${infoExtra.num}** acabou de sair do forno!`;
        embed.fields = [
            { name: "📖 Título do Cap", value: infoExtra.title || "Sem título", inline: false },
            { name: "📑 Status no Site", value: manga.status, inline: true }
        ];
    }

    const payload = {
        username: manga.title,
        avatar_url: manga.coverUrl,
        content: tipo === 'novo_manga' ? "@everyone **NOVIDADE NA SCAN!**" : "@everyone **LANÇAMENTO!**",
        embeds: [embed]
    };

    await fetch(WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
}

async function executar() {
    const mangasAtuais = extrairMangas();
    if (!mangasAtuais) return;

    let cache = [];
    if (fs.existsSync(CACHE_FILE)) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    }

    for (const manga of mangasAtuais) {
        const mangaNoCache = cache.find(m => m.id === manga.id);

        if (!mangaNoCache) {
            await enviarDiscord(manga, 'novo_manga');
        } else {
            const totalCapsAtuais = manga.chapters ? manga.chapters.length : 0;
            const totalCapsCache = mangaNoCache.chapters ? mangaNoCache.chapters.length : 0;

            if (totalCapsAtuais > totalCapsCache) {
                const ultimoCap = manga.chapters[totalCapsAtuais - 1];
                await enviarDiscord(manga, 'novo_cap', { 
                    num: ultimoCap.chapterNumber, 
                    title: ultimoCap.title 
                });
            }
        }
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(mangasAtuais, null, 2));
}

executar();
