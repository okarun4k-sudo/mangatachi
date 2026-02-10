import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    // Permite que seu site acesse a API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    try {
        // Busca o arquivo manga_cache.json que está na raiz do seu projeto
        const filePath = path.join(process.cwd(), 'manga_cache.json');
        const fileData = fs.readFileSync(filePath, 'utf8');
        const cache = JSON.parse(fileData);

        // Se você pesquisar por um manga específico (?slug=nome)
        if (slug) {
            if (cache[slug]) {
                return res.status(200).json(cache[slug]);
            } else {
                return res.status(404).json({ error: "Manga não encontrado no seu cache." });
            }
        }

        // Se não enviar slug, mostra todos os mangas salvos no cache
        return res.status(200).json(cache);

    } catch (error) {
        return res.status(500).json({ 
            error: "Erro ao ler o cache", 
            detalhes: "Verifique se o arquivo manga_cache.json existe na raiz." 
        });
    }
}
