import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    try {
        const filePath = path.join(process.cwd(), 'manga_cache.json');
        const fileData = fs.readFileSync(filePath, 'utf8');
        const mangas = JSON.parse(fileData); // Aqui é uma lista []

        if (slug) {
            // Procurar na lista o mangá que tem o título parecido com o slug
            // Transformamos o título em "slug" para comparar (ex: "Jukai" vira "jukai")
            const mangaEncontrado = mangas.find(m => 
                m.title.toLowerCase().replace(/ /g, '-') === slug.toLowerCase()
            );

            if (mangaEncontrado) {
                // Ajusta os nomes dos campos para o que seu site espera
                const resposta = {
                    titulo: mangaEncontrado.title,
                    capitulos: mangaEncontrado.chapters.map(c => ({
                        numero: c.chapterNumber,
                        titulo: c.title,
                        link_leitura: `#/obras/${slug}/${c.chapterNumber}`
                    }))
                };
                return res.status(200).json(resposta);
            } else {
                return res.status(404).json({ error: "Mangá não encontrado na lista." });
            }
        }

        // Se não passar slug, retorna a lista simplificada para a Home
        return res.status(200).json(mangas.map(m => ({
            titulo: m.title,
            slug: m.title.toLowerCase().replace(/ /g, '-'),
            capa: m.coverUrl
        })));

    } catch (error) {
        return res.status(500).json({ error: "Erro ao processar o cache local" });
    }
}
