// api/mangas.js
import { mangas } from './_data.js';

// Função para padronizar o Slug (URL amigável)
const toSlug = (text) => text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .trim();

export default function handler(req, res) {
    // Configuração de Headers para permitir o Front-end acessar
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    try {
        // Se o usuário passou um slug (ex: /api/mangas?slug=jukai)
        if (slug) {
            const manga = mangas.find(m => 
                m.id.toString() === slug || toSlug(m.title) === slug
            );

            if (!manga) {
                return res.status(404).json({ error: "Mangá não encontrado" });
            }

            // Retorna os detalhes do mangá e a lista de capítulos
            return res.status(200).json({
                id: manga.id,
                titulo: manga.title,
                descricao: manga.description,
                capa: manga.coverUrl,
                capitulos: manga.chapters.map(c => ({
                    numero: c.chapterNumber,
                    titulo: c.title,
                    // Aqui enviamos as páginas para o leitor usar
                    paginas: c.pages 
                }))
            });
        }

        // Se não passou slug, retorna a lista para a Home
        const vitrine = mangas.map(m => ({
            id: m.id,
            titulo: m.title,
            capa: m.coverUrl,
            slug: toSlug(m.title)
        }));

        return res.status(200).json(vitrine);

    } catch (error) {
        return res.status(500).json({ error: "Erro no servidor", details: error.message });
    }
}
