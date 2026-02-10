import { mangas } from '../manga.js'; // Certifique-se de que o caminho está correto para a raiz

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    try {
        if (slug) {
            // Função para transformar títulos em slugs (remover acentos e espaços)
            const getSlug = (text) => text.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9]/g, '-');

            // Procura o mangá pelo ID ou pelo Slug do título
            const mangaEncontrado = mangas.find(m => 
                m.id.toString() === slug || getSlug(m.title) === slug
            );

            if (mangaEncontrado) {
                // Retorna o formato exato que o seu front-end espera
                return res.status(200).json({
                    titulo: mangaEncontrado.title,
                    descricao: mangaEncontrado.description,
                    capa: mangaEncontrado.coverUrl,
                    capitulos: mangaEncontrado.chapters.map(c => ({
                        numero: c.chapterNumber,
                        titulo: c.title,
                        // Gera o link interno para a leitura
                        link_leitura: `#/obras/${slug}/${c.chapterNumber}`
                    }))
                });
            } else {
                return res.status(404).json({ error: "Mangá não encontrado" });
            }
        }

        // Se não houver slug, retorna a lista simplificada para a home
        const listaHome = mangas.map(m => ({
            id: m.id,
            titulo: m.title,
            capa: m.coverUrl,
            slug: m.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-')
        }));

        return res.status(200).json(listaHome);

    } catch (error) {
        return res.status(500).json({ error: "Erro interno", mensagem: error.message });
    }
}
