// routes.js - Sistema de rotas para páginas individuais de mangás

class MangaRouter {
    constructor() {
        this.routes = {
            '/obras': this.showMangaList.bind(this),
            '/obras/:mangaSlug': this.showMangaDetail.bind(this),
            '/obras/:mangaSlug/:chapter': this.showMangaReader.bind(this)
        };
        
        this.init();
    }
    
    init() {
        // Verificar se estamos em uma página de obra
        this.checkCurrentRoute();
        
        // Adicionar event listener para links
        this.setupLinkInterception();
    }
    
    checkCurrentRoute() {
        const path = window.location.pathname;
        
        if (path.startsWith('/obras/')) {
            this.handleRoute(path);
        }
    }
    
    handleRoute(path) {
        const pathParts = path.split('/').filter(part => part !== '');
        
        if (pathParts.length === 2 && pathParts[0] === 'obras') {
            // /obras/manga-slug
            this.showMangaDetail(pathParts[1]);
        } else if (pathParts.length === 3 && pathParts[0] === 'obras') {
            // /obras/manga-slug/chapter
            this.showMangaReader(pathParts[1], pathParts[2]);
        } else if (pathParts.length === 1 && pathParts[0] === 'obras') {
            // /obras
            this.showMangaList();
        }
    }
    
    setupLinkInterception() {
        document.addEventListener('click', (e) => {
            const link = e.target.closest('a');
            if (link && link.href && link.href.includes('/obras/')) {
                e.preventDefault();
                const path = new URL(link.href).pathname;
                window.history.pushState({}, '', path);
                this.handleRoute(path);
            }
        });
        
        // Handle browser back/forward
        window.addEventListener('popstate', () => {
            this.checkCurrentRoute();
        });
    }
    
    showMangaList() {
        // Redirecionar para a página principal
        if (window.location.pathname !== '/') {
            window.location.href = '/';
        }
    }
    
    showMangaDetail(mangaSlug) {
        const manga = this.findMangaBySlug(mangaSlug);
        if (manga) {
            this.renderMangaDetailPage(manga);
        } else {
            this.show404();
        }
    }
    
    showMangaReader(mangaSlug, chapter) {
        const manga = this.findMangaBySlug(mangaSlug);
        if (manga) {
            const chapterNum = parseInt(chapter);
            this.renderMangaReaderPage(manga, chapterNum);
        } else {
            this.show404();
        }
    }
    
    findMangaBySlug(slug) {
        return mangas.find(manga => this.slugify(manga.title) === slug);
    }
    
    slugify(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    }
    
    renderMangaDetailPage(manga) {
        document.body.innerHTML = this.generateMangaDetailHTML(manga);
        this.attachMangaDetailEvents(manga);
    }
    
    renderMangaReaderPage(manga, chapterNum) {
        document.body.innerHTML = this.generateMangaReaderHTML(manga, chapterNum);
        this.attachMangaReaderEvents(manga, chapterNum);
    }
    
    generateMangaDetailHTML(manga) {
        const slug = this.slugify(manga.title);
        const totalChapters = getTotalChapters(manga);
        
        return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${manga.title} - MangaScan</title>
            <link rel="icon" type="image/png" href="https://files.catbox.moe/qcjov3.webp">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <link rel="stylesheet" href="style.css">
            <style>
                .manga-detail-page {
                    background: var(--background-dark);
                    min-height: 100vh;
                }
                .manga-detail-header {
                    background: var(--background-card);
                    padding: 1rem 0;
                    border-bottom: 1px solid #eaeaea;
                }
                .manga-detail-container {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem 1rem;
                    display: grid;
                    grid-template-columns: 300px 1fr;
                    gap: 2rem;
                }
                .manga-cover-large {
                    width: 100%;
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow);
                }
                .manga-info-detailed {
                    background: var(--background-card);
                    padding: 2rem;
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow);
                }
                .chapter-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                    gap: 1rem;
                    margin-top: 2rem;
                }
                .chapter-card {
                    background: var(--background-card);
                    padding: 1rem;
                    border-radius: var(--border-radius);
                    border: 1px solid #eaeaea;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    text-decoration: none;
                    color: inherit;
                    display: block;
                }
                .chapter-card:hover {
                    border-color: var(--primary-color);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                @media (max-width: 768px) {
                    .manga-detail-container {
                        grid-template-columns: 1fr;
                    }
                    .chapter-grid {
                        grid-template-columns: 1fr;
                    }
                }
            </style>
        </head>
        <body class="manga-detail-page">
            <header class="manga-detail-header">
                <div class="container">
                    <a href="/" style="text-decoration: none; color: inherit;">
                        <h1 class="logo">
                            <i class="fas fa-book"></i> MangaScan
                        </h1>
                    </a>
                </div>
            </header>
            
            <main>
                <div class="manga-detail-container">
                    <div class="manga-cover-section">
                        <img src="${manga.coverUrl}" alt="${manga.title}" class="manga-cover-large">
                    </div>
                    
                    <div class="manga-info-detailed">
                        <h1>${manga.title}</h1>
                        <div class="manga-meta" style="margin: 1rem 0;">
                            <p><strong>Autor:</strong> ${manga.author}</p>
                            <p><strong>Status:</strong> ${manga.status}</p>
                            <p><strong>Equipe:</strong> ${manga.translationTeam}</p>
                            <p><strong>Capítulos:</strong> ${totalChapters}</p>
                        </div>
                        
                        <div class="genres">
                            ${manga.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                        </div>
                        
                        <div style="margin-top: 1.5rem;">
                            <p><strong>Sinopse:</strong></p>
                            <p style="margin-top: 0.5rem; line-height: 1.6;">${manga.description}</p>
                        </div>
                        
                        <div class="chapter-grid">
                            ${this.generateChapterCards(manga, slug)}
                        </div>
                    </div>
                </div>
            </main>
            
            <script src="manga.js"></script>
            <script src="routes.js"></script>
        </body>
        </html>
        `;
    }
    
    generateChapterCards(manga, slug) {
        let chaptersHTML = '';
        let allChapters = [];
        
        // Coletar todos os capítulos
        if (manga.oneshot) allChapters.push(...manga.oneshot);
        if (manga.chapters) allChapters.push(...manga.chapters);
        if (manga.volumes) {
            manga.volumes.forEach(volume => {
                allChapters.push(...volume.chapters);
            });
        }
        
        // Ordenar capítulos
        allChapters.sort((a, b) => {
            if (a.type === 'oneshot') return 1;
            if (b.type === 'oneshot') return -1;
            return b.chapterNumber - a.chapterNumber;
        });
        
        allChapters.forEach(chapter => {
            const chapterNum = chapter.type === 'oneshot' ? 'Oneshot' : chapter.chapterNumber;
            const chapterUrl = `/obras/${slug}/${chapterNum}`;
            
            chaptersHTML += `
                <a href="${chapterUrl}" class="chapter-card">
                    <div class="chapter-info">
                        <div class="chapter-title">
                            ${chapter.type === 'oneshot' ? 
                                `<i class="fas fa-bullseye"></i> Oneshot` : 
                                `<i class="fas fa-book"></i> Capítulo ${chapter.chapterNumber}`
                            }
                        </div>
                        ${chapter.title && chapter.type !== 'oneshot' ? 
                            `<div style="font-size: 0.9rem; color: var(--text-gray); margin-top: 0.3rem;">${chapter.title}</div>` : 
                            ''
                        }
                        <div class="chapter-meta" style="margin-top: 0.5rem;">
                            <i class="fas fa-file-image"></i> ${chapter.pages.length} páginas
                        </div>
                    </div>
                </a>
            `;
        });
        
        return chaptersHTML;
    }
    
    generateMangaReaderHTML(manga, chapterNum) {
        // Implementação similar ao leitor atual, mas em página separada
        return `
        <!DOCTYPE html>
        <html lang="pt-BR">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${manga.title} - Capítulo ${chapterNum} - MangaScan</title>
            <link rel="icon" type="image/png" href="https://files.catbox.moe/qcjov3.webp">
            <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
            <link rel="stylesheet" href="style.css">
        </head>
        <body>
            <div class="manga-reader" style="display: block;">
                <div class="reader-header">
                    <a href="/obras/${this.slugify(manga.title)}" class="btn-back">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </a>
                    <h3>${manga.title} - Capítulo ${chapterNum}</h3>
                </div>
                <div class="reader-content">
                    <div id="mangaPagesContainer">
                        <!-- As páginas serão carregadas aqui -->
                    </div>
                </div>
            </div>
            
            <script src="manga.js"></script>
            <script>
                // Carregar o capítulo específico
                const manga = mangas.find(m => m.id === ${manga.id});
                const chapter = manga.chapters.find(c => c.chapterNumber === ${chapterNum});
                
                if (chapter) {
                    const container = document.getElementById('mangaPagesContainer');
                    chapter.pages.forEach(pageUrl => {
                        const img = document.createElement('img');
                        img.src = pageUrl;
                        img.className = 'manga-page';
                        img.loading = 'lazy';
                        container.appendChild(img);
                    });
                }
            </script>
        </body>
        </html>
        `;
    }
    
    attachMangaDetailEvents(manga) {
        // Eventos para a página de detalhes
        console.log('Manga detail page loaded:', manga.title);
    }
    
    attachMangaReaderEvents(manga, chapterNum) {
        // Eventos para o leitor
        console.log('Manga reader loaded:', manga.title, 'Chapter:', chapterNum);
    }
    
    show404() {
        document.body.innerHTML = `
            <div style="text-align: center; padding: 4rem;">
                <h1>Mangá não encontrado</h1>
                <p>O mangá que você está procurando não existe.</p>
                <a href="/" style="color: var(--primary-color);">Voltar para a página inicial</a>
            </div>
        `;
    }
}

// Inicializar o router quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', () => {
    new MangaRouter();
});

// Função auxiliar para gerar URLs de obras
function generateMangaUrl(manga) {
    const router = new MangaRouter();
    const slug = router.slugify(manga.title);
    return `/obras/${slug}`;
}

// Função auxiliar para gerar URLs de capítulos
function generateChapterUrl(manga, chapterNumber) {
    const router = new MangaRouter();
    const slug = router.slugify(manga.title);
    return `/obras/${slug}/${chapterNumber}`;
}