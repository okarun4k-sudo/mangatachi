const fs = require('fs');

const FILE_PATH = './manga.js'; 
const WEBHOOK_URL = process.env.DISCORD_WEBHOOK_URL;
const ICONE_PNG = "https://files.catbox.moe/0rjf4e.png"; 

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

    // AUMENTAMOS PARA 10: No mês você provavelmente terá mais obras atualizadas
    const destaques = mangas.slice(-10).reverse(); 

    const fields = destaques.map(m => {
        const ultimoCap = m.chapters[m.chapters.length - 1];
        const teaser = m.description 
            ? `*${m.description.substring(0, 80)}...*` 
            : `Confira as últimas atualizações desta obra incrível!`;

        return {
            name: `🏆 ${m.title.toUpperCase()}`,
            value: `> ${teaser}\n**Status no Mês:** \`Cap. ${ultimoCap.chapterNumber} disponível\`\n[**➜ Ver no Mangatachi**](https://mangatachi.vercel.app/#/obras/${m.id})`,
            inline: false 
        };
    });

    const payload = {
        username: "Mangatachi Mensal",
        avatar_url: ICONE_PNG,
        content: "⭐ **FECHAMENTO DO MÊS MANGATACHI!**",
        embeds: [{
            title: "📚 RETROSPECTIVA MENSAL - O MELHOR DA SCAN",
            description: "O mês termina, mas as histórias continuam! Aqui está o resumo de tudo o que brilhou no nosso site nos últimos 30 dias. Coloque sua leitura em dia para começar o próximo mês com tudo!",
            color: 15277667, 
            fields: fields,
            image: { url: destaques[0].coverUrl }, 
            footer: { 
                text: "Mangatachi • Agradecemos por ler conosco este mês!", 
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
