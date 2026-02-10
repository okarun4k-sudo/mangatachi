import fs from 'fs';
import path from 'path';

export default function handler(req, res) {
    // Configurações para o site conseguir ler a API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const { slug } = req.query;

    try {
        // Localiza o arquivo manga_cache.json na raiz do seu projeto
        const filePath = path.join(process.cwd(), 'manga_cache.json');
        const fileData = fs.readFileSync(filePath, 'utf8');
        const cache = JSON.parse(fileData);

        // Se você buscar por um manga específico (?slug=nome)
        if (slug) {
            // Se o slug existir no seu JSON, ele retorna os dados
            if (cache[slug]) {
                return res.status(200).json(cache[slug]);
            } else {
                return res.status(404).json({ error: "Manga não encontrado no cache" });
            }
        }

        // Se não mandar slug, mostra tudo o que tem no cache
        return res.status(200).json(cache);

    } catch (error) {
        return res.status(500).json({ error: "Erro ao ler o arquivo de cache local" });
    }
}
