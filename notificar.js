const fs = require('fs');

const FILE_PATH = './manga.js'; 
const CACHE_FILE = './manga_cache.json';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

function gerarSlug(title) {
    return title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
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
    
    // Define qual cargo mencionar baseado no tipo de atualização
    const mencao = tipo === 'novo_manga' ? '@Novas Obras' : '@Novos Capitulos';

    let embed = {
        title: tipo === 'novo_manga' ? `✨ NOVIDADE: ${manga.title}` : `🚀 ATUALIZAÇÃO: ${manga.title}`,
        url: linkManga,
        color: tipo === 'novo_manga' ? 15277667 : 5763719,
        image: { url: manga.coverUrl },
        timestamp: new Date(),
        footer: { text: "Mangatachi Reader • Sistema de Notificações" }
    };

    if (tipo === 'novo_manga') {
        embed.description = `🎉 **Um novo título chegou à nossa biblioteca!**\n\n> ${manga.description ? manga.description.substring(0, 150) + '...' : ''}\n\n[**🔗 Ler Agora**](${linkManga})`;
        embed.fields = [
            { name: "✍️ Autor", value: manga.author, inline: true },
            { name: "🏷️ Gêneros", value: manga.genres.join(", "), inline: true }
        ];
    } else {
        embed.description = `📖 O capítulo **${infoExtra.num}** de **${manga.title}** já está disponível no site!\n\n[**📖 Ler o Capítulo agora**](${linkManga})`;
        if (infoExtra.title) {
            embed.fields = [{ name: "📑 Título do Cap", value: infoExtra.title, inline: false }];
        }
    }

    const payload = {
        username: "Mangatachi Bot",
        avatar_url: "https://mangatachi.vercel.app/favicon.ico",
        content: `🔔 ${mencao}`, // Menciona apenas o cargo geral
        embeds: [embed],
        allowed_mentions: { parse: ["roles"] } // Permite apenas a menção de cargos
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

    let cacheExistia = fs.existsSync(CACHE_FILE);
    let cache = [];
    
    if (cacheExistia) {
        cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } else {
        // Na primeira vez, cria o cache sem avisar nada (para evitar spam)
        console.log("Criando cache inicial silencioso...");
        fs.writeFileSync(CACHE_FILE, JSON.stringify(mangasAtuais, null, 2));
        return;
    }

    for (const manga of mangasAtuais) {
        const mangaNoCache = cache.find(m => m.id === manga.id);

        if (!mangaNoCache) {
            await enviarDiscord(manga, 'novo_manga');
        } else {
            const totalCapsAtuais = manga.chapters ? manga.chapters.length : 0;
            const totalCapsCache = mangaNoCache.chapters ? mangaNoCache.chapters.length : 0;

            if (totalCapsAtuais > totalCapsCache) {
                const novosCaps = manga.chapters.slice(totalCapsCache);
                for (const cap of novosCaps) {
                    await enviarDiscord(manga, 'novo_cap', { 
                        num: cap.chapterNumber, 
                        title: cap.title 
                    });
                }
            }
        }
    }

    fs.writeFileSync(CACHE_FILE, JSON.stringify(mangasAtuais, null, 2));
}

executar();
