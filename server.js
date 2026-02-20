// Middleware de proteção
app.use('/api/proxy/image', (req, res, next) => {
  const referer = req.headers.referer |

| req.headers.origin;
  const allowedDomain = 'mangatachi.vercel.app';

  if (!referer ||!referer.includes(allowedDomain)) {
    return res.status(403).json({ error: 'Acesso negado: Hotlinking não permitido.' });
  }
  
  // Garante que o User-Agent não seja spoofed para a API do MangaDex
  req.headers['user-agent'] = 'Mangatachi-Reader/1.0'; 
  next();
});

import express from 'express';
import cors from 'cors';
import { mangas } from './api/_data.js';

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

// Isso permite que o código ainda rode localmente, mas a Vercel vai ignorar
if (process.env.NODE_ENV !== 'production') {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Rodando na porta ${PORT}`));
}

// ESSENCIAL PARA VERCEL:
export default app;
