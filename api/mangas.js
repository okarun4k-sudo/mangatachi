import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    try {
        // Lendo o arquivo JSON que você já tem no repositório
        const filePath = path.join(process.cwd(), 'manga_cache.json');
        const fileData = fs.readFileSync(filePath, 'utf8');
        const mangas = JSON.parse(fileData); 

        if (slug) {
            // Procuramos o mangá na lista. 
            // Comparamos o título (virando slug) ou o ID
            const mangaEncontrado = mangas.find(m => {
                const tituloSlug = m.title.toLowerCase()
                    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // remove acentos
                    .replace(/[^a-z0-9]/g, '-'); // troca tudo que não é letra/número por hífen
                
                return tituloSlug === slug || m.id.toString() === slug;
            });

            if (mangaEncontrado) {
                return res.status(200).json({
                    titulo: mangaEncontrado.title,
                    capitulos: mangaEncontrado.chapters.map(c => ({
                        numero: c.chapterNumber,
                        titulo: c.title,
                        link_leitura: `#/obras/${slug}/${c.chapterNumber}`
                    }))
                });
            } else {
                return res.status(404).json({ error: "Manga nao encontrado no cache" });
            }
        }

        // Se não houver slug, retorna a lista para a página inicial
        const listaSimplificada = mangas.map(m => ({
            id: m.id,
            titulo: m.title,
            capa: m.coverUrl,
            slug: m.title.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '-')
        }));

        return res.status(200).json(listaSimplificada);

    } catch (error) {
        return res.status(500).json({ error: "Erro ao ler dados", mensagem: error.message });
    }
}
