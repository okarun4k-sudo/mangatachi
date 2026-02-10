import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    // Libera o acesso para o seu site (CORS)
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    try {
        // Exemplo: Buscando mangás de uma fonte (ajuste a URL para a que você quiser)
        const response = await axios.get('https://mangalivre.net/lista-de-mangas'); 
        const $ = cheerio.load(response.data);
        const mangas = [];

        // Esse seletor abaixo é um exemplo, precisa ser ajustado conforme o site alvo
        $('.manga-item').each((i, el) => {
            mangas.push({
                titulo: $(el).find('.manga-title').text(),
                link: $(el).find('a').attr('href')
            });
        });

        return res.status(200).json({ status: "sucesso", data: mangas });
    } catch (error) {
        return res.status(500).json({ error: "Erro ao buscar dados", detalhes: error.message });
    }
}
