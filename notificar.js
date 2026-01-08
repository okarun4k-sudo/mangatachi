const fs = require('fs');

const FILE_PATH = './manga.js'; 
const CACHE_FILE = './manga_cache.json';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

// Função para transformar o título do mangá no link da URL (slug)
function gerarSlug(title) {
    return title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // Remove acentos
        .replace(/[^\w\s-]/g, "")       // Remove caracteres especiais
        .replace(/\s+/g, "-")           // Substitui espaços por -
        .replace(/-+/g, "-")            // Evita hífens duplos
        .trim();
}

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
    const slug = gerarSlug(manga.title);
    const linkManga = `https://mangatachi.vercel.app/#/obras/${slug}`;
    
    // Sistema de Menção por Nome
    const mencao = `@${manga.title}`;

    let embed = {
        title: tipo === 'novo_manga' ? `✨ NOVO MANGÁ: ${manga.title}` : `🚀 NOVO CAPÍTULO: ${manga.title}`,
        url: linkManga,
        color: tipo === 'novo_manga' ? 15277667 : 5763719,
        image: { url: manga.coverUrl },
        timestamp: new Date(),
        footer: { text: "Mangatachi Reader • Atualização Automática" }
    };

    if (tipo === 'novo_manga') {
        embed.description = `${manga.description ? manga.description.substring(0, 150) + '...' : ''}\n\n[**🔗 Clique aqui para ler no Site**](${linkManga})`;
        embed.fields = [
            { name: "✍️ Autor", value: manga.author, inline: true },
            { name: "🏷️ Gêneros", value: manga.genres.join(", "), inline: true }
        ];
    } else {
        embed.description = `O capítulo **${infoExtra.num}** já está disponível!\n\n[**📖 Ler o Capítulo ${infoExtra.num} agora**](${linkManga})`;
        embed.fields = [
            { name: "📖 Título", value: infoExtra.title || `Capítulo ${infoExtra.num}`, inline: false }
        ];
    }

    const payload = {
        username: manga.title,
        avatar_url: manga.coverUrl,
        content: `🔔 ${mencao} ${tipo === 'novo_manga' ? 'acaba de chegar!' : 'tem novidade!'}`,
        embeds: [embed],
        allowed_mentions: { parse: ["roles", "everyone"] }
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
