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
    
    // MELHORIA NA MENÇÃO: Se o nome tiver espaços, o Discord precisa que ele 
    // esteja exatamente como o nome do Cargo. 
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
        embed.description = `O capítulo **${infoExtra.num}** de **${manga.title}** já está disponível!\n\n[**📖 Ler o Capítulo ${infoExtra.num} agora**](${linkManga})`;
        if (infoExtra.title) {
            embed.fields = [{ name: "📖 Título do Cap", value: infoExtra.title, inline: false }];
        }
    }

    const payload = {
        username: "Mangatachi Bot",
        avatar_url: "https://mangatachi.vercel.app/favicon.ico", // Coloque seu favicon aqui
        content: `🔔 **${mencao}** ${tipo === 'novo_manga' ? 'foi adicionado à biblioteca!' : 'recebeu atualização!'}`,
        embeds: [embed],
        allowed_mentions: { parse: ["roles", "everyone", "users"] }
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
        // Se o cache NÃO existe, criamos ele agora com o que já tem no site
        // para não disparar 50 notificações de uma vez na primeira rodada.
        console.log("Criando cache inicial silencioso...");
        fs.writeFileSync(CACHE_FILE, JSON.stringify(mangasAtuais, null, 2));
        return; // Para aqui e só avisa no próximo Push
    }

    for (const manga of mangasAtuais) {
        const mangaNoCache = cache.find(m => m.id === manga.id);

        if (!mangaNoCache) {
            // Se o ID é novo no arquivo, avisa novo mangá
            await enviarDiscord(manga, 'novo_manga');
        } else {
            const totalCapsAtuais = manga.chapters ? manga.chapters.length : 0;
            const totalCapsCache = mangaNoCache.chapters ? mangaNoCache.chapters.length : 0;

            if (totalCapsAtuais > totalCapsCache) {
                // Pega apenas os capítulos novos (caso você adicione mais de um de uma vez)
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

    // Salva o estado atual
    fs.writeFileSync(CACHE_FILE, JSON.stringify(mangasAtuais, null, 2));
}

executar();
