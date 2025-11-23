// meta-tags.js
const META_TAGS_CONFIG = {
    // Página inicial (default)
    "home": {
        title: "MangaScan - Leitor de Mangás Online",
        description: "Leia mangás online gratuitamente. Biblioteca com diversos títulos e leitor online otimizado.",
        image: "https://files.catbox.moe/3i8sby.jpg",
        url: "https://manga-room-scan.vercel.app",
        type: "website"
    },
    
    // Mangás individuais
    "mangas": {
        "horobi-no-kuni-no-seifukusha-maou-wa-sekai-wo-seifukusuru-youdesu": {
            title: "Horobi no Kuni no Seifukusha: Maou wa Sekai wo Seifukusuru youdesu",
            description: "A história de um maquiagem que conquista um mundo em destruição.",
            image: "https://files.catbox.moe/capa-horobi.jpg",
            type: "article"
        },
        "jukai": {
            title: "Jukai",
            description: "O Templo Kuyou é um lugar onde são levados todos os tipos de objetos amaldiçoados.",
            image: "https://files.catbox.moe/58u20d.jpg",
            type: "article"
        },
        "one-piece": {
            title: "One Piece",
            description: "A aventura de Luffy e sua tripulação em busca do tesouro supremo.",
            image: "https://files.catbox.moe/capa-onepiece.jpg",
            type: "article"
        }
        // Adicione mais mangás aqui conforme necessário
    }
};

// Função para atualizar meta tags dinamicamente
function updateMetaTags() {
    const currentHash = window.location.hash;
    const baseUrl = "https://manga-room-scan.vercel.app";
    
    let metaConfig = META_TAGS_CONFIG.home; // Default
    
    // Verificar se é uma rota de obra
    if (currentHash.startsWith('#/obras/')) {
        const routeParts = currentHash.split('/').filter(part => part !== '' && part !== '#');
        
        if (routeParts.length >= 2) {
            const mangaSlug = routeParts[1];
            
            // Verificar se o mangá existe na configuração
            if (META_TAGS_CONFIG.mangas[mangaSlug]) {
                metaConfig = META_TAGS_CONFIG.mangas[mangaSlug];
                metaConfig.url = `${baseUrl}/#/obras/${mangaSlug}`;
            }
        }
    }
    
    // Atualizar meta tags
    updateMetaTag('property', 'og:title', metaConfig.title);
    updateMetaTag('property', 'og:description', metaConfig.description);
    updateMetaTag('property', 'og:image', metaConfig.image);
    updateMetaTag('property', 'og:url', metaConfig.url || META_TAGS_CONFIG.home.url);
    updateMetaTag('property', 'og:type', metaConfig.type || 'website');
    
    // Atualizar Twitter Cards
    updateMetaTag('name', 'twitter:title', metaConfig.title);
    updateMetaTag('name', 'twitter:description', metaConfig.description);
    updateMetaTag('name', 'twitter:image', metaConfig.image);
    
    // Atualizar title da página
    document.title = metaConfig.title;
    
    console.log('✅ Meta tags atualizadas para:', metaConfig.title);
}

// Função auxiliar para atualizar meta tags
function updateMetaTag(attr, name, content) {
    let metaTag = document.querySelector(`meta[${attr}="${name}"]`);
    
    if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute(attr, name);
        document.head.appendChild(metaTag);
    }
    
    metaTag.setAttribute('content', content);
}

// Inicializar sistema de meta tags
function initializeMetaTags() {
    // Atualizar meta tags na carga inicial
    updateMetaTags();
    
    // Observar mudanças na hash (SPA navigation)
    window.addEventListener('hashchange', updateMetaTags);
    
    // Observar mudanças no popstate (botões voltar/avançar)
    window.addEventListener('popstate', updateMetaTags);
}

// Inicializar quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', initializeMetaTags);