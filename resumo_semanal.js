const fs = require('fs');

const FILE_PATH = './manga.js'; 
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const ICONE_PNG = "https://files.catbox.moe/0rjf4e.png"; // Seu ícone profissional

function extrairMangas() {
    try {
        const content = fs.readFileSync(FILE_PATH, 'utf8');
        const match = content.match(/const\s+mangas\s*=\s*(\[[\s\S]*?\]);/);
        return match ? eval(match[1]) : null;
    } catch (e) { return null; }
}

async function enviarNewsletter() {
    const mangas = extrairMangas();
    if (!mangas) return;

    // Pega os últimos 5 mangás mexidos para não poluir muito
    const destaques = mangas.slice(-5).reverse(); 

    const fields = destaques.map(m => {
        const ultimoCap = m.chapters[m.chapters.length - 1];
        // Cria um pequeno resumo de curiosidade baseado na descrição ou gênero
        const teaser = m.description 
            ? `*${m.description.substring(0, 60)}...*` 
            : `Prepare-se para fortes emoções neste novo capítulo!`;

        return {
            name: `🔥 ${m.title.toUpperCase()}`,
            value: `> ${teaser}\n**Status:** \`Cap. ${ultimoCap.chapterNumber} disponível\`\n[**➜ Ler agora no site**](https://mangatachi.vercel.app/#/obras/${m.id})`,
            inline: false // Deixamos false para dar mais destaque ao texto de curiosidade
        };
    });

    const payload = {
        username: "Mangatachi Semanário",
        avatar_url: ICONE_PNG,
        content: "⭐ **O RESUMO DA SEMANA CHEGOU!**",
        embeds: [{
            title: "🗞️ MANGATACHI NEWS - EDIÇÃO DOMINGÃO",
            description: "Perdeu algum lançamento? A semana foi agitada e nossos tradutores não pararam! Confira os destaques que você precisa ler antes da segunda-feira começar:",
            color: 15277667, // Dourado profissional
            fields: fields,
            image: { url: destaques[0].coverUrl }, // Usa a capa do mangá mais recente como banner
            footer: { 
                text: "Mangatachi Reader • Onde a história continua", 
                icon_url: ICONE_PNG 
            },
            timestamp: new Date()
        }]
    };

    await fetch(WEBHOOK_URL, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify(payload) 
    });
}

enviarNewsletter();
