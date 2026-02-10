// api/mangas.js
import { mangas } from './_data.js';

const toSlug = (text) => text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .trim();

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    try {
        if (slug) {
            const manga = mangas.find(m => 
                m.id.toString() === slug || toSlug(m.title) === slug
            );

            if (!manga) return res.status(404).json({ error: "Mangá não encontrado" });

            return res.status(200).json({
                titulo: manga.title,
                descricao: manga.description,
                capa: manga.coverUrl,
                autor: manga.author,
                generos: manga.genres,
                capitulos: manga.chapters.map(c => ({
                    numero: c.chapterNumber,
                    titulo: c.title,
                    paginas: c.pages // Importante: as URLs das imagens vão aqui
                }))
            });
        }

        // Se não houver slug, lista todos para a Home
        const listaHome = mangas.map(m => ({
            id: m.id,
            titulo: m.title,
            capa: m.coverUrl,
            slug: toSlug(m.title)
        }));

        return res.status(200).json(listaHome);
    } catch (e) {
        return res.status(500).json({ error: e.message });
    }
}
