import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
    // Configuração de Headers para evitar bloqueios
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    // Pegamos o 'slug' (ID do manga) da URL, se existir
    const { slug } = req.query;

    try {
        if (slug) {
            // ROTA: Detalhes de um Mangá específico
            // Exemplo de uso: /api/mangas?slug=nome-do-manga
            
            // Aqui você deve colocar a URL real da fonte que você quer "scrapear"
            const urlFonte = `https://mangalivre.net/manga/${slug}`; 
            const response = await axios.get(urlFonte);
            const $ = cheerio.load(response.data);

            const detalhes = {
                titulo: $('.manga-title').text().trim(),
                capitulos: []
            };

            // Exemplo de como pegar a lista de capítulos (ajuste o seletor conforme o site fonte)
            $('.full-chapters-list li').each((i, el) => {
                detalhes.capitulos.push({
                    numero: $(el).find('.cap-text').text().trim(),
                    link_leitura: `/obras/${slug}/${$(el).find('.cap-text').text().trim()}`
                });
            });

            return res.status(200).json(detalhes);

        } else {
            // ROTA: Listagem Geral de Mangás
            // Exemplo de uso: /api/mangas
            
            const response = await axios.get('https://mangalivre.net/lista-de-mangas');
            const $ = cheerio.load(response.data);
            const listaMangas = [];

            $('.manga-item').each((i, el) => {
                listaMangas.push({
                    titulo: $(el).find('.manga-title').text().trim(),
                    slug: $(el).find('a').attr('href').split('/').pop(),
                    capa: $(el).find('img').attr('src')
                });
            });

            return res.status(200).json(listaMangas);
        }
    } catch (error) {
        return res.status(500).json({ 
            error: "Erro ao processar requisição", 
            mensagem: error.message 
        });
    }
}
