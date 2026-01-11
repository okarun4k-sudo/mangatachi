const fs = require('fs');

const FILE_PATH = './manga.js'; 
const CACHE_FILE = './manga_cache.json';
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;

const ID_CARGO_NOVAS_OBRAS = "1458876008785641652"; 
const ID_CARGO_NOVOS_CAPITULOS = "1458876246841757726"; 

function gerarSlug(title) {
    return title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\w\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim();
}

function extrairMangas() {
    try {
        const content = fs.readFileSync(FILE_PATH, 'utf8');
        const match = content.match(/const\s+mangas\s*=\s*(\[[\s\S]*?\]);/);
        return match ? eval(match[1]) : null;
    } catch (e) { return null; }
}

async function enviarDiscord(manga, tipo, infoExtra = {}) {
    const slug = gerarSlug(manga.title);
    const linkManga = `https://mangatachi.vercel.app/#/obras/${slug}`;
    const mencao = tipo === 'novo_manga' ? `<@&${ID_CARGO_NOVAS_OBRAS}>` : `<@&${ID_CARGO_NOVOS_CAPITULOS}>`;

    let embed = {
        title: manga.title.toUpperCase(),
        url: linkManga,
        color: tipo === 'novo_manga' ? 15277667 : 3447003, // Dourado para novos, Azul para capítulos
        image: { url: manga.coverUrl },
        timestamp: new Date(),
        footer: { 
            text: "Mangatachi Reader • Atualizações em tempo real", 
            icon_url: "https://mangatachi.vercel.app/favicon.ico" 
        }
    };

    if (tipo === 'novo_manga') {
        embed.description = `🆕 **NOVA OBRA ADICIONADA!**\n\n${manga.description ? "*" + manga.description.substring(0, 120) + "...*" : ""}\n\n[**Ler no Mangatachi**](${linkManga})`;
        embed.fields = [
            { name: "✍️ Autor", value: `\`${manga.author}\``, inline: true },
            { name: "🏷️ Gêneros", value: `\`${manga.genres.slice(0, 3).join(", ")}\``, inline: true }
        ];
    } else {
        embed.description = `🚀 **NOVO CAPÍTULO DISPONÍVEL!**\n\nO capítulo **${infoExtra.num}** já pode ser lido em nosso site.`;
        embed.fields = [
            { name: "📖 Capítulo", value: `\`Cap. ${infoExtra.num}\``, inline: true },
            { name: "📑 Título", value: `\`${infoExtra.title || "---"}\``, inline: true },
            { name: "🔗 Link Direto", value: `[Clique aqui para ler](${linkManga})`, inline: false }
        ];
    }

    const payload = {
        username: "Mangatachi Notificações",
        avatar_url: "https://mangatachi.vercel.app/favicon.ico", 
        content: `🔔 **ALERTA DE LANÇAMENTO:** ${mencao}`,
        embeds: [embed],
        allowed_mentions: { roles: [ID_CARGO_NOVAS_OBRAS, ID_CARGO_NOVOS_CAPITULOS] }
    };

    await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}

async function executar() {
    const mangasAtuais = extrairMangas();
    if (!mangasAtuais) return;
    let cache = fs.existsSync(CACHE_FILE) ? JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) : (fs.writeFileSync(CACHE_FILE, JSON.stringify(mangasAtuais, null, 2)), []);
    if (cache.length === 0) return;

    for (const manga of mangasAtuais) {
        const mangaNoCache = cache.find(m => m.id === manga.id);
        if (!mangaNoCache) await enviarDiscord(manga, 'novo_manga');
        else if (manga.chapters.length > mangaNoCache.chapters.length) {
            const novos = manga.chapters.slice(mangaNoCache.chapters.length);
            for (const cap of novos) await enviarDiscord(manga, 'novo_cap', { num: cap.chapterNumber, title: cap.title });
        }
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(mangasAtuais, null, 2));
}
executar();
