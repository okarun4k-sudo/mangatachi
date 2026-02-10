import express from 'express';
import cors from 'cors';
import { mangas } from './api/_data.js'; // Ajuste o caminho se necessário

const app = express();
app.use(cors());
app.use(express.json());

const toSlug = (text) => text.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .trim();

app.get('/api/mangas', (req, res) => {
    const { slug } = req.query;
    if (slug) {
        const manga = mangas.find(m => toSlug(m.title) === slug || m.id.toString() === slug);
        return manga ? res.json(manga) : res.status(404).json({ error: "Não encontrado" });
    }
    res.json(mangas.map(m => ({ id: m.id, titulo: m.title, slug: toSlug(m.title) })));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
