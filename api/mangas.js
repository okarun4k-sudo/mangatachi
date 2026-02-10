import { mangas } from '../manga.js';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    // Função única de slug para evitar divergências
    const createSlug = (text) => text.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, '-')
        .replace(/-+/g, '-') // Remove hífens duplos
        .trim();

    try {
        if (slug) {
            const mangaEncontrado = mangas.find(m => 
                m.id.toString() === slug || createSlug(m.title) === slug
            );

            if (mangaEncontrado) {
                return res.status(200).json({
                    id: mangaEncontrado.id,
                    titulo: mangaEncontrado.title,
                    descricao: mangaEncontrado.description,
                    capa: mangaEncontrado.coverUrl,
                    autor: mangaEncontrado.author,
                    generos: mangaEncontrado.genres,
                    equipe: mangaEncontrado.translationTeam,
                    status: mangaEncontrado.status,
                    capitulos: mangaEncontrado.chapters.map(c => ({
                        numero: c.chapterNumber,
                        titulo: c.title,
                        // Enviamos as páginas aqui para o leitor conseguir acessar
                        paginas: c.pages, 
                        link_leitura: `#/obras/${createSlug(mangaEncontrado.title)}/${c.chapterNumber}`
                    }))
                });
            }
            return res.status(404).json({ error: "Mangá não encontrado" });
        }

        // Listagem simplificada para a Home
        const listaHome = mangas.map(m => ({
            id: m.id,
            titulo: m.title,
            capa: m.coverUrl,
            slug: createSlug(m.title)
        }));

        return res.status(200).json(listaHome);

    } catch (error) {
        return res.status(500).json({ error: "Erro interno", mensagem: error.message });
    }
}
