// CONSTANTES DO SISTEMA
const SITE_VERSION = "3.0.2 (16)";
const DISCORD_SERVER_ID = "1403373682868359238";

// Função para verificar se usuário está no servidor
async function checkDiscordServerMembership(userId) {
    try {
        const token = localStorage.getItem('discordToken');
        if (!token) return false;

        const response = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const guilds = await response.json();
            const isMember = guilds.some(guild => guild.id === DISCORD_SERVER_ID);
            console.log('✅ Usuário está no servidor?', isMember);
            return isMember;
        }
    } catch (error) {
        console.error('❌ Erro ao verificar servidor:', error);
    }
    return false;
}

// Variáveis globais
let currentManga = null;
let currentChapter = null;
let currentPage = 0;
let allChapters = [];
let currentView = 'grid';
let imageCache = new Map();
let searchTimeout = null;
let isSearchActive = false;

// CONFIGURAÇÃO DO TEMPO DE ESPERA (em segundos)
const DOWNLOAD_WAIT_TIME = 15;

// Configurações do Discord OAuth
const DISCORD_CLIENT_ID = "1437114497050345613";
const DISCORD_REDIRECT_URI = "https://mangatachi.vercel.app/auth.html";
// EM script.js - Substitua a linha antiga por esta:
const DISCORD_SCOPE = "identify email guilds.members.read";


// ===============================
// CONFIGURAÇÕES FIREBASE
// ===============================

// 🔥 CONFIGURAÇÕES DO FIREBASE PARA CURTIDAS
const firebaseConfigLikes = {
    apiKey: "AIzaSyDOuDwRhFPSdsuP440oP8ZVhb9ppZhBE_k",
    authDomain: "manga-likr.firebaseapp.com",
    databaseURL: "https://manga-likr-default-rtdb.firebaseio.com",
    projectId: "manga-likr",
    storageBucket: "manga-likr.firebasestorage.app",
    messagingSenderId: "437785700414",
    appId: "1:437785700414:web:788a5fb6ddf1f7a452896f"
};

// Inicializar Firebase para Curtidas
let firebaseAppLikes;
try {
    firebaseAppLikes = firebase.initializeApp(firebaseConfigLikes, 'likes');
    console.log('✅ Firebase Curtidas inicializado com sucesso!');
} catch (error) {
    if (error.code === 'app/duplicate-app') {
        firebaseAppLikes = firebase.app('likes');
        console.log('✅ Firebase Curtidas já estava inicializado');
    } else {
        console.error('❌ Erro ao inicializar Firebase Curtidas:', error);
    }
}

// ===============================
// SISTEMA VIP / REMOÇÃO DE ANÚNCIOS
// ===============================

// IDs dos cargos que NÃO devem ver anúncios (Donator, Staff, Equipe, etc.)
const VIP_ROLE_IDS = [
    "1403377953739374753",
    "1403378167162343425",
    "1422726987918606428",
    "1423653900849774602",
    "1436304148562968647",
    "1436305523401293904",
    "1424056194934243449",
    "1424056449499267153",
    "1436306716487581777",
    "1441114038212890627",
    "1458795212502728745"
];

// Função para verificar cargos e remover anúncios
async function checkVipStatus() {
    const token = localStorage.getItem('discordToken');
    if (!token) return;

    // ID do seu servidor MangaTachi
    const SERVER_ID = "1403373682868359238"; 

    try {
        // Busca os dados do membro neste servidor específico
        const response = await fetch(`https://discord.com/api/users/@me/guilds/${SERVER_ID}/member`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const memberData = await response.json();
            const userRoles = memberData.roles; // Lista de cargos do usuário

            // Verifica se o usuário tem algum dos cargos da lista VIP
            const isVip = userRoles.some(roleId => VIP_ROLE_IDS.includes(roleId));

            if (isVip) {
                console.log('💎 VIP Detectado: Removendo publicidade...');
                disableAds();
            } else {
                console.log('👤 Usuário comum: Mantendo publicidade.');
            }
        }
    } catch (error) {
        console.error('Erro ao verificar VIP:', error);
    }
}

// Função que remove os anúncios da tela
function disableAds() {
    // 1. Marca o corpo do site como VIP (para o CSS funcionar)
    document.body.classList.add('is-vip-user');

    // 2. Remove elementos de anúncio via Javascript
    const adSelectors = [
        '.ad-container', 
        '.download-ad-container', 
        '.ad-responsive',
        '.ad-featured',
        'ins.adsbygoogle', // Google Adsense
        'iframe[src*="highperformanceformat"]' // Seus anúncios popunder
    ];

    adSelectors.forEach(selector => {
        document.querySelectorAll(selector).forEach(el => {
            el.remove(); // Deleta o elemento do HTML
        });
    });
}


// ===============================
// SISTEMA DE BUSCA AVANÇADO
// ===============================

// Inicializar sistema de busca
function initializeSearchSystem() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    // Criar container para resultados em tempo real
    const searchResultsContainer = document.createElement('div');
    searchResultsContainer.id = 'searchResultsContainer';
    searchResultsContainer.className = 'search-results-container';
    searchInput.parentNode.appendChild(searchResultsContainer);

    // Event listeners para busca em tempo real
    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);
    searchInput.addEventListener('blur', handleSearchBlur);
    
    // Tecla Escape para limpar busca
    searchInput.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });

    console.log('✅ Sistema de busca inicializado');
}

// Manipular input de busca em tempo real
function handleSearchInput(e) {
    const searchTerm = e.target.value.trim();
    
    // Clear previous timeout
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    // Hide results if empty
    if (searchTerm === '') {
        hideSearchResults();
        clearSearch();
        return;
    }
    
    // Show loading state
    showSearchLoading();
    
    // Debounce search
    searchTimeout = setTimeout(() => {
        performRealTimeSearch(searchTerm);
    }, 300);
}

// Manipular foco na busca
function handleSearchFocus() {
    const searchTerm = document.getElementById('searchInput').value.trim();
    if (searchTerm !== '') {
        performRealTimeSearch(searchTerm);
    }
}

// Manipular perda de foco na busca
function handleSearchBlur() {
    // Pequeno delay para permitir clicar nos resultados
    setTimeout(() => {
        hideSearchResults();
    }, 200);
}

// Executar busca em tempo real
function performRealTimeSearch(searchTerm) {
    if (searchTerm.length < 2) {
        hideSearchResults();
        return;
    }
    
    const results = searchMangas(searchTerm);
    displaySearchResults(results, searchTerm);
}

// Buscar mangás com algoritmo melhorado
function searchMangas(searchTerm) {
    const term = searchTerm.toLowerCase().trim();
    if (term.length < 2) return [];
    
    return mangas.filter(manga => {
        const titleMatch = manga.title.toLowerCase().includes(term);
        const authorMatch = manga.author.toLowerCase().includes(term);
        const genreMatch = manga.genres.some(genre => 
            genre.toLowerCase().includes(term)
        );
        
        // Busca por palavras-chave no título
        const titleWords = manga.title.toLowerCase().split(/\s+/);
        const keywordMatch = titleWords.some(word => 
            word.startsWith(term) || term.startsWith(word)
        );
        
        return titleMatch || authorMatch || genreMatch || keywordMatch;
    }).slice(0, 8); // Limitar a 8 resultados
}

// Exibir resultados da busca
function displaySearchResults(results, searchTerm) {
    const container = document.getElementById('searchResultsContainer');
    if (!container) return;
    
    if (results.length === 0) {
        container.innerHTML = `
            <div class="search-result-item no-results">
                <i class="fas fa-search"></i>
                <div class="result-info">
                    <div class="result-title">Nenhum mangá encontrado</div>
                    <div class="result-subtitle">Tente buscar por título, autor ou gênero</div>
                </div>
            </div>
        `;
    } else {
        container.innerHTML = results.map(manga => `
            <div class="search-result-item" onclick="selectSearchResult(${manga.id})">
                <img src="${manga.coverUrl}" alt="${manga.title}" class="result-cover">
                <div class="result-info">
                    <div class="result-title">${highlightMatch(manga.title, searchTerm)}</div>
                    <div class="result-subtitle">
                        <i class="fas fa-user-pen"></i> ${manga.author}
                    </div>
                    <div class="result-meta">
                        <span class="status-badge ${manga.status === 'Em andamento' ? 'status-ongoing' : 'status-complete'}">
                            ${manga.status}
                        </span>
                        <span><i class="fas fa-book"></i> ${getTotalChapters(manga)} cap</span>
                    </div>
                </div>
            </div>
        `).join('');
    }
    
    container.style.display = 'block';
    isSearchActive = true;
    
    // Esconder carrossel e outros elementos durante a busca
    hideCarousel();
    hideMainContent();
}

// Destacar termo buscado nos resultados
function highlightMatch(text, searchTerm) {
    const term = searchTerm.toLowerCase();
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(term);
    
    if (index === -1) return text;
    
    const before = text.substring(0, index);
    const match = text.substring(index, index + searchTerm.length);
    const after = text.substring(index + searchTerm.length);
    
    return `${before}<span class="highlight">${match}</span>${after}`;
}

// Mostrar estado de carregamento na busca
function showSearchLoading() {
    const container = document.getElementById('searchResultsContainer');
    if (!container) return;
    
    container.innerHTML = `
        <div class="search-result-item loading">
            <i class="fas fa-spinner fa-spin"></i>
            <div class="result-info">
                <div class="result-title">Buscando...</div>
            </div>
        </div>
    `;
    container.style.display = 'block';
}

// Esconder resultados da busca
function hideSearchResults() {
    const container = document.getElementById('searchResultsContainer');
    if (container) {
        container.style.display = 'none';
    }
}

// Selecionar resultado da busca
function selectSearchResult(mangaId) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
        searchInput.blur();
    }
    
    hideSearchResults();
    showMangaDetails(mangaId);
    isSearchActive = false;
}

// Limpar busca
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.value = '';
    }
    
    hideSearchResults();
    isSearchActive = false;
    
    // Mostrar conteúdo principal apenas se estiver na home
    if (isHomePage()) {
        showMainContent();
        showCarousel();
    }
}

// ===============================
// SISTEMA DE BOTÃO VOLTAR FIXO
// ===============================

// Criar botão voltar fixo
function createFixedBackButton() {
    // Remove o botão existente se houver
    const existingBtn = document.querySelector('.fixed-back-btn');
    if (existingBtn) {
        existingBtn.remove();
    }

    // Cria o novo botão fixo
    const fixedBackBtn = document.createElement('button');
    fixedBackBtn.className = 'fixed-back-btn';
    fixedBackBtn.innerHTML = '<i class="fas fa-arrow-left"></i> <span>Voltar</span>';
    fixedBackBtn.onclick = goBackToHome;
    
    // Adiciona ao body
    document.body.appendChild(fixedBackBtn);
    
    return fixedBackBtn;
}

// Mostrar/ocultar botão voltar baseado na página
function updateFixedBackButton() {
    const fixedBackBtn = document.querySelector('.fixed-back-btn');
    
    if (isHomePage() || window.location.hash === '#/' || !window.location.hash) {
        // Esconder na página inicial
        if (fixedBackBtn) {
            fixedBackBtn.style.display = 'none';
        }
    } else {
        // Mostrar em outras páginas
        if (fixedBackBtn) {
            fixedBackBtn.style.display = 'flex';
        } else {
            createFixedBackButton();
        }
    }
}

// ===============================
// SISTEMA DE DOWNLOAD DIRETO
// ===============================

let currentDownloadMangaId = null;
let currentChapterNumber = null;
let countdownTimer = null;
let countdownSeconds = DOWNLOAD_WAIT_TIME;

// Função principal do botão de download
function handleDownload(mangaId, chapterNumber = null) {
    console.log('🔄 Iniciando download para mangá ID:', mangaId);
    console.log('📖 Capítulo:', chapterNumber);
    
    // DEFINIR AS VARIÁVEIS GLOBAIS
    currentDownloadMangaId = mangaId;
    currentChapterNumber = chapterNumber;
    
    // Verificar se o sistema de download está carregado
    if (typeof downloadHasChapters !== 'function') {
        console.error('❌ Sistema de download não carregado');
        showToast('<i class="fas fa-exclamation-triangle"></i> Sistema de download não disponível');
        return;
    }
    
    // Verificar se há capítulos disponíveis
    if (!downloadHasChapters(mangaId)) {
        showToast('<i class="fas fa-exclamation-triangle"></i> Nenhum capítulo disponível para download');
        return;
    }
    
    showDownloadModal();
}

// Mostrar modal de download simples
function showDownloadModal() {
    const downloadModal = document.getElementById('downloadModal');
    const directDownloadBtn = document.getElementById('directDownloadBtn');
    const countdownElement = document.getElementById('countdown');
    
    if (!downloadModal || !directDownloadBtn || !countdownElement) {
        console.error('❌ Elementos do modal não encontrados');
        return;
    }
    
    // Adicionar classe ao body para bloquear clicks
    document.body.classList.add('modal-download-open');
    
    // Resetar estado
    directDownloadBtn.disabled = true;
    directDownloadBtn.innerHTML = '<i class="fas fa-clock"></i> Aguarde...';
    countdownSeconds = DOWNLOAD_WAIT_TIME;
    countdownElement.textContent = DOWNLOAD_WAIT_TIME;
    
    // Iniciar contador regressivo
    startCountdown();
    
    // Mostrar modal
    downloadModal.style.display = 'block';
    
    // Mostrar anúncio no modal
    showDownloadAd();
}

// Iniciar contador regressivo
function startCountdown() {
    const directDownloadBtn = document.getElementById('directDownloadBtn');
    const countdownElement = document.getElementById('countdown');
    const timerProgress = document.querySelector('.timer-progress');
    
    if (countdownTimer) {
        clearInterval(countdownTimer);
    }
    
    // Resetar barra de progresso
    if (timerProgress) {
        timerProgress.style.width = '0%';
    }
    
    countdownTimer = setInterval(() => {
        countdownSeconds--;
        countdownElement.textContent = countdownSeconds;
        
        // Atualizar barra de progresso
        if (timerProgress) {
            const progress = ((DOWNLOAD_WAIT_TIME - countdownSeconds) / DOWNLOAD_WAIT_TIME) * 100;
            timerProgress.style.width = `${progress}%`;
        }
        
        if (countdownSeconds <= 0) {
            // Tempo esgotado - ativar botão
            clearInterval(countdownTimer);
            directDownloadBtn.disabled = false;
            directDownloadBtn.innerHTML = '<i class="fas fa-download"></i> Iniciar Download';
            countdownElement.textContent = '0';
            
            // Completar barra de progresso
            if (timerProgress) {
                timerProgress.style.width = '100%';
            }
        }
    }, 1000);
}

// Iniciar download direto
function startDirectDownload() {
    console.log('⬇️ Iniciando download direto...');
    
    let downloadLink = '';
    
    // Buscar link de download
    if (currentChapterNumber && currentDownloadMangaId) {
        downloadLink = downloadGetChapterLink(currentDownloadMangaId, currentChapterNumber);
    } else if (currentDownloadMangaId) {
        const chapters = downloadGetChapters(currentDownloadMangaId);
        if (chapters && Object.keys(chapters).length > 0) {
            const firstChapter = Object.keys(chapters)[0];
            downloadLink = chapters[firstChapter];
        }
    }
    
    if (downloadLink) {
        console.log('🚀 Abrindo download direto:', downloadLink);
        window.open(downloadLink, '_blank');
        showToast('<i class="fas fa-download"></i> Download iniciado!');
    } else {
        console.error('❌ Nenhum link de download encontrado');
        showToast('<i class="fas fa-exclamation-triangle"></i> Link de download não encontrado');
    }
    
    closeDownloadModal();
}

// Fechar modal de download
function closeDownloadModal() {
    const downloadModal = document.getElementById('downloadModal');
    if (downloadModal) {
        downloadModal.style.display = 'none';
    }
    
    // Remover classe do body para liberar clicks
    document.body.classList.remove('modal-download-open');
    
    // Esconder anúncio do modal
    hideDownloadAd();
    
    // Limpar timer
    if (countdownTimer) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
    
    // Resetar variáveis
    currentDownloadMangaId = null;
    currentChapterNumber = null;
}

// Função para download de capítulo específico
function downloadChapter(mangaId, chapterNumber) {
    console.log('📥 Iniciando download do capítulo:', chapterNumber);
    
    const downloadLink = downloadGetChapterLink(mangaId, chapterNumber);
    if (downloadLink) {
        currentDownloadMangaId = mangaId;
        currentChapterNumber = chapterNumber;
        showDownloadModal();
    } else {
        showToast('<i class="fas fa-exclamation-triangle"></i> Link de download não encontrado');
    }
}

// Mostrar anúncio no modal de download
function showDownloadAd() {
    const downloadAdContainer = document.getElementById('downloadAdContainer');
    if (!downloadAdContainer) return;
    
    downloadAdContainer.innerHTML = `
        <div class="download-ad-content">
            <div class="ad-label">Publicidade</div>
            <div class="ad-banner">
                <!-- Anúncio do modal de download -->
                <script type="text/javascript">
                    atOptions = {
                        'key' : '6eebdabd75fbad48930c5ae82ea5e5c4',
                        'format' : 'iframe',
                        'height' : 250,
                        'width' : 300,
                        'params' : {}
                    };
                </script>
                <script type="text/javascript" src="//www.highperformanceformat.com/6eebdabd75fbad48930c5ae82ea5e5c4/invoke.js"></script>
            </div>
            <p class="ad-support-text">O anúncio ajuda a manter o site gratuito</p>
        </div>
    `;
    downloadAdContainer.style.display = 'block';
}

// Esconder anúncio do modal de download
function hideDownloadAd() {
    const downloadAdContainer = document.getElementById('downloadAdContainer');
    if (downloadAdContainer) {
        downloadAdContainer.style.display = 'none';
        downloadAdContainer.innerHTML = '';
    }
}

// ===============================
// CARROSSEL DE MANGÁS
// ===============================

function initializeCarousel() {
    const carouselTrack = document.getElementById('carouselTrack');
    if (!carouselTrack) return;

    // Selecionar 5 mangás aleatórios ou os primeiros 5
    const featuredMangas = mangas.slice(0, 5);
    
    carouselTrack.innerHTML = featuredMangas.map(manga => `
        <div class="carousel-item" onclick="showMangaDetails(${manga.id})">
            <img src="${manga.coverUrl}" alt="${manga.title}" class="carousel-cover" loading="lazy">
            <div class="carousel-info">
                <div class="carousel-title">${manga.title}</div>
                <div class="carousel-author">
                    <i class="fas fa-user-pen"></i> ${manga.author}
                </div>
            </div>
        </div>
    `).join('');

    // Duplicar os itens para criar um loop contínuo
    carouselTrack.innerHTML += carouselTrack.innerHTML;
}

// ===============================
// CONTROLE DE VISIBILIDADE DO CARROSSEL - CORRIGIDO
// ===============================

// Função para esconder o carrossel
function hideCarousel() {
    const carousel = document.getElementById('mangaCarousel');
    if (carousel) {
        carousel.style.display = 'none';
        console.log('🔴 Carrossel escondido');
    }
}

// Função para mostrar o carrossel
function showCarousel() {
    const carousel = document.getElementById('mangaCarousel');
    if (carousel) {
        carousel.style.display = 'block';
        console.log('🟢 Carrossel mostrado');
    }
}

// Verificar se é a página inicial
function isHomePage() {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    return (path === '/' || path === '/index.html' || path === '' || path.includes('index.html')) && 
           (!hash || hash === '#/' || hash === '#' || hash === '');
}

// ===============================
// SISTEMA DE BOTÃO VOLTAR AO TOPO NO LEITOR
// ===============================

// Criar botão voltar ao topo
function createBackToTopButton() {
    const existingButton = document.querySelector('.back-to-top-reader');
    if (existingButton) {
        existingButton.remove();
    }

    const backToTopBtn = document.createElement('button');
    backToTopBtn.className = 'back-to-top-reader';
    backToTopBtn.innerHTML = '<i class="fas fa-arrow-up"></i>';
    backToTopBtn.title = 'Voltar ao início do capítulo';
    backToTopBtn.onclick = scrollToTopOfReader;
    
    document.body.appendChild(backToTopBtn);
    return backToTopBtn;
}

// Função para rolar até o topo do leitor
function scrollToTopOfReader() {
    const readerContent = document.querySelector('.reader-content-spa') || document.querySelector('.reader-content');
    if (readerContent) {
        readerContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
}

// Função para verificar a posição de scroll e mostrar/ocultar o botão
function handleReaderScroll() {
    const readerContent = document.querySelector('.reader-content-spa') || document.querySelector('.reader-content');
    const backToTopBtn = document.querySelector('.back-to-top-reader');
    
    if (!readerContent || !backToTopBtn) return;

    // Altura da viewport
    const viewportHeight = window.innerHeight;
    // Posição atual do scroll
    const scrollTop = readerContent.scrollTop || document.documentElement.scrollTop;
    
    // Mostrar botão apenas se scrolou pelo menos 2 "páginas" (2x altura da viewport)
    if (scrollTop > viewportHeight * 2) {
        backToTopBtn.classList.add('visible');
    } else {
        backToTopBtn.classList.remove('visible');
    }
}

// Configurar o sistema de scroll no leitor
function setupReaderScrollSystem() {
    const readerContent = document.querySelector('.reader-content-spa') || document.querySelector('.reader-content');
    if (!readerContent) return;

    // Criar o botão
    createBackToTopButton();
    
    // Adicionar event listener para scroll
    readerContent.addEventListener('scroll', handleReaderScroll);
    
    // Verificar posição inicial
    setTimeout(handleReaderScroll, 100);
}

// Remover o sistema de scroll quando sair do leitor
function cleanupReaderScrollSystem() {
    const backToTopBtn = document.querySelector('.back-to-top-reader');
    if (backToTopBtn) {
        backToTopBtn.remove();
    }
    
    const readerContent = document.querySelector('.reader-content-spa') || document.querySelector('.reader-content');
    if (readerContent) {
        readerContent.removeEventListener('scroll', handleReaderScroll);
    }
}

// ===============================
// FUNÇÕES BÁSICAS E MODAIS
// ===============================

// Fechar modal
function closeModal() {
    const modal = document.getElementById('mangaModal');
    if (modal) {
        modal.style.display = 'none';
    }
    showHeaderElements();
}

// Fechar leitor
function closeReader() {
    cleanupReaderScrollSystem(); // Limpar sistema de scroll
    const reader = document.getElementById('mangaReader');
    if (reader) {
        reader.style.display = 'none';
    }
    currentManga = null;
    currentChapter = null;
    currentPage = 0;
    showHeaderElements();
}

// Esconder elementos do header (search bar e hamburger)
function hideHeaderElements() {
    const searchBar = document.querySelector('.search-bar');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    
    if (searchBar) searchBar.style.display = 'none';
    if (hamburgerBtn) hamburgerBtn.style.display = 'none';
}

// Mostrar elementos do header (search bar e hamburger)
function showHeaderElements() {
    const searchBar = document.querySelector('.search-bar');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    
    if (searchBar) searchBar.style.display = 'flex';
    if (hamburgerBtn) hamburgerBtn.style.display = 'flex';
}

// Mostrar toast notification
function showToast(message) {
    let toast = document.getElementById('toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'toast';
        document.body.appendChild(toast);
    }
    
    toast.innerHTML = message;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===============================
// SISTEMA DE CURTIDAS COM FIREBASE - MELHORADO (ESTILO YOUTUBE)
// ===============================

class LikeSystem {
    constructor() {
        this.db = firebase.database(firebaseAppLikes);
        this.likesRef = this.db.ref('likes');
    }

    // Verificar se usuário já curtiu
    async hasUserLiked(mangaId, userId) {
        try {
            const snapshot = await this.likesRef.child(mangaId).child(userId).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Erro ao verificar curtida:', error);
            return false;
        }
    }

    // Adicionar curtida
    async addLike(mangaId, mangaTitle, userId, userName) {
        try {
            await this.likesRef.child(mangaId).child(userId).set({
                manga_title: mangaTitle,
                user_name: userName,
                timestamp: Date.now()
            });
            console.log('✅ Curtida adicionada para mangá:', mangaId, 'usuário:', userId);
            return true;
        } catch (error) {
            console.error('Erro ao curtir:', error);
            return false;
        }
    }

    // Remover curtida
    async removeLike(mangaId, userId) {
        try {
            await this.likesRef.child(mangaId).child(userId).remove();
            console.log('✅ Curtida removida para mangá:', mangaId, 'usuário:', userId);
            return true;
        } catch (error) {
            console.error('Erro ao remover curtida:', error);
            return false;
        }
    }

    // Obter contagem de curtidas
    async getLikeCount(mangaId) {
        try {
            const snapshot = await this.likesRef.child(mangaId).once('value');
            const count = snapshot.numChildren();
            console.log('📊 Contagem de curtidas para mangá', mangaId, ':', count);
            return count;
        } catch (error) {
            console.error('Erro ao buscar contagem:', error);
            return 0;
        }
    }

    // Escutar mudanças em tempo real
    listenToLikes(mangaId, callback) {
        console.log('🎯 Iniciando listener para mangá:', mangaId);
        
        this.likesRef.child(mangaId).on('value', (snapshot) => {
            const count = snapshot.numChildren();
            console.log('🔄 Listener: contagem atualizada para', count, 'curtidas');
            callback(count);
        });
        
        return () => {
            this.stopListening(mangaId);
        };
    }

    // Parar de escutar mudanças
    stopListening(mangaId) {
        this.likesRef.child(mangaId).off();
        console.log('🛑 Listener parado para mangá:', mangaId);
    }
}

// Instância global do sistema de curtidas
const likeSystem = new LikeSystem();

// ===============================
// FUNÇÕES DE UI PARA CURTIDAS - ESTILO YOUTUBE
// ===============================

// Gerar HTML do botão de curtida (ESTILO YOUTUBE)
function generateLikeButton(manga) {
    return `
        <div class="like-section">
            <button class="like-btn youtube-style" onclick="toggleLike(${manga.id})" id="likeBtn-${manga.id}">
                <div class="like-btn-content">
                    <i class="fas fa-thumbs-up"></i>
                    <span class="like-count" id="likeCount-${manga.id}">0</span>
                </div>
            </button>
            <div class="like-info" id="likeInfo-${manga.id}">
                <small>Faça login com Discord para curtir</small>
            </div>
        </div>
    `;
}

// Alternar curtida
async function toggleLike(mangaId) {
    console.log('🖱️ Clicou em curtir mangá:', mangaId);
    
    const user = checkAuth();
    if (!user) {
        showToast('<i class="fas fa-exclamation-triangle"></i> Faça login com Discord para curtir!');
        return;
    }

    const manga = mangas.find(m => m.id === mangaId);
    if (!manga) {
        console.error('Mangá não encontrado:', mangaId);
        return;
    }

    const likeBtn = document.getElementById(`likeBtn-${mangaId}`);
    if (!likeBtn) {
        console.error('Botão de curtida não encontrado:', `likeBtn-${mangaId}`);
        return;
    }
    
    likeBtn.disabled = true;
    const originalHTML = likeBtn.innerHTML;
    likeBtn.innerHTML = '<div class="like-btn-content"><i class="fas fa-spinner fa-spin"></i></div>';

    try {
        const hasLiked = await likeSystem.hasUserLiked(mangaId, user.id);
        console.log('Usuário já curtiu?', hasLiked);
        
        if (hasLiked) {
            // Descurtir
            console.log('Removendo curtida...');
            const success = await likeSystem.removeLike(mangaId, user.id);
            if (success) {
                showToast('<i class="fas fa-thumbs-up"></i> Curtida removida');
                updateLikeButtonUI(mangaId, false);
            }
        } else {
            // Curtir
            console.log('Adicionando curtida...');
            const success = await likeSystem.addLike(mangaId, manga.title, user.id, user.username);
            if (success) {
                showToast('<i class="fas fa-thumbs-up"></i> Mangá curtido!');
                updateLikeButtonUI(mangaId, true);
            }
        }
        
    } catch (error) {
        console.error('Erro ao alternar curtida:', error);
        showToast('<i class="fas fa-exclamation-triangle"></i> Erro ao curtir');
    } finally {
        likeBtn.disabled = false;
        likeBtn.innerHTML = originalHTML;
        updateLikeButtonState(mangaId);
    }
}

// Atualizar UI do botão de curtida (ESTILO YOUTUBE)
function updateLikeButtonUI(mangaId, hasLiked) {
    const likeBtn = document.getElementById(`likeBtn-${mangaId}`);
    const likeInfo = document.getElementById(`likeInfo-${mangaId}`);
    
    if (!likeBtn) return;
    
    const icon = likeBtn.querySelector('i');
    if (hasLiked) {
        icon.className = 'fas fa-thumbs-up';
        likeBtn.classList.add('liked');
        if (likeInfo) {
            likeInfo.innerHTML = '<small>Você curtiu este mangá</small>';
        }
    } else {
        icon.className = 'far fa-thumbs-up';
        likeBtn.classList.remove('liked');
        if (likeInfo) {
            const user = checkAuth();
            if (user) {
                likeInfo.innerHTML = '<small>Clique para curtir</small>';
            } else {
                likeInfo.innerHTML = '<small>Faça login com Discord para curtir</small>';
            }
        }
    }
}

// Atualizar estado do botão baseado no Firebase
async function updateLikeButtonState(mangaId) {
    const likeBtn = document.getElementById(`likeBtn-${mangaId}`);
    const likeInfo = document.getElementById(`likeInfo-${mangaId}`);
    
    if (!likeBtn) return;
    
    const user = checkAuth();
    if (user) {
        try {
            const hasLiked = await likeSystem.hasUserLiked(mangaId, user.id);
            updateLikeButtonUI(mangaId, hasLiked);
        } catch (error) {
            console.error('Erro ao atualizar estado do botão:', error);
        }
    } else {
        updateLikeButtonUI(mangaId, false);
        if (likeInfo) {
            likeInfo.innerHTML = '<small>Faça login com Discord para curtir</small>';
        }
    }
}

// Atualizar contagem de curtidas
async function updateLikeCount(mangaId) {
    try {
        const count = await likeSystem.getLikeCount(mangaId);
        const likeCount = document.getElementById(`likeCount-${mangaId}`);
        if (likeCount) {
            likeCount.textContent = count;
        }
    } catch (error) {
        console.error('Erro ao atualizar contagem:', error);
    }
}

// Inicializar sistema de curtidas para um mangá
function initializeLikes(mangaId) {
    console.log('🎯 Inicializando curtidas para mangá:', mangaId);
    
    // Atualizar contagem inicial
    updateLikeCount(mangaId);
    
    // Atualizar estado do botão
    updateLikeButtonState(mangaId);
    
    // Escutar mudanças em tempo real
    const cleanupListener = likeSystem.listenToLikes(mangaId, (count) => {
        console.log('🔄 Listener: contagem atualizada para', count);
        const likeCount = document.getElementById(`likeCount-${mangaId}`);
        if (likeCount) {
            likeCount.textContent = count;
        }
    });
    
    // Polling de fallback a cada 5 segundos
    const pollingInterval = setInterval(() => {
        updateLikeCount(mangaId);
        updateLikeButtonState(mangaId);
    }, 5000);
    
    // Retornar função de limpeza
    return () => {
        console.log('🧹 Limpando curtidas para mangá:', mangaId);
        if (cleanupListener) cleanupListener();
        clearInterval(pollingInterval);
        likeSystem.stopListening(mangaId);
    };
}

// Verificar conexão Firebase
function checkFirebaseConnection() {
    const connectedRef = firebase.database(firebaseAppLikes).ref(".info/connected");
    connectedRef.on("value", function(snap) {
        if (snap.val() === true) {
            console.log("✅ Firebase Curtidas CONECTADO");
        } else {
            console.log("❌ Firebase Curtidas DESCONECTADO");
        }
    });
}

// Inicializar verificação de conexão
checkFirebaseConnection();

// ===============================
// SISTEMA DE DIREITOS AUTORAIS AUTOMÁTICO
// ===============================

// Gerar seção de direitos autorais baseada nos dados do mangá
function generateCopyrightSection(manga) {
    // Verificar se o mangá tem informações específicas de direitos autorais
    const hasCopyrightInfo = manga.copyrightInfo || manga.originalLink || manga.officialLink;
    
    if (hasCopyrightInfo) {
        // Usar informações específicas do mangá se disponíveis
        const copyrightInfo = manga.copyrightInfo || {};
        return `
            <div class="credit-notice">
                <div class="credit-header">
                    <i class="fas fa-info-circle"></i>
                    <h4>Informações de Direitos Autorais</h4>
                </div>
                <div class="credit-content">
                    ${copyrightInfo.author ? `<p><strong>Créditos ao Autor Original:</strong> ${copyrightInfo.author}</p>` : ''}
                    ${copyrightInfo.originalTitle ? `<p><strong>Título Original:</strong> ${copyrightInfo.originalTitle}</p>` : `<p><strong>Título Original:</strong> ${manga.title}</p>`}
                    ${manga.originalLink ? `<p><strong>Link Oficial:</strong> <a href="${manga.originalLink}" target="_blank">${manga.originalLink}</a></p>` : ''}
                    ${manga.officialLink ? `<p><strong>Link Oficial:</strong> <a href="${manga.officialLink}" target="_blank">${manga.officialLink}</a></p>` : ''}
                    <p><strong>Tradução:</strong> Equipe MangaTachi</p>
                    ${copyrightInfo.disclaimer ? `<p class="disclaimer">${copyrightInfo.disclaimer}</p>` : ''}
                </div>
            </div>
        `;
    } else {
        // Template padrão para mangás sem informações específicas
        return `
            <div class="credit-notice">
                <div class="credit-header">
                    <i class="fas fa-info-circle"></i>
                    <h4>Informações de Direitos Autorais</h4>
                </div>
                <div class="credit-content">
                    <p><strong>Créditos ao Autor Original:</strong> ${manga.author}</p>
                    <p><strong>Título Original:</strong> ${manga.title}</p>
                    <p><strong>Tradução:</strong> Equipe MangaTachi</p>
                </div>
            </div>
        `;
    }
}

// ===============================
// INICIALIZAÇÃO PRINCIPAL
// ===============================

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM Carregado - Iniciando aplicação');
    initializeCache();
    setupEventListeners();
    
    // Inicializar carrossel
    initializeCarousel();
    
    // Inicializar sistema de download
    initializeDownloadSystem();
    
    // Inicializar sistema de busca
    initializeSearchSystem();
    
    // Inicializar botão voltar fixo
    createFixedBackButton();
    updateFixedBackButton();
    
    // Inicializar tema
    initializeTheme();
    
    // Verificar se estamos em uma rota de obra e processar
    processCurrentRoute();
});

// Processar a rota atual
function processCurrentRoute() {
    const path = window.location.pathname;
    const hash = window.location.hash;
    
    console.log('Processando rota:', path, 'Hash:', hash);
    
    // Sempre esconder carrossel primeiro, depois mostrar apenas se for home
    hideCarousel();
    
    // Atualizar botão voltar
    updateFixedBackButton();
    
    // Se tiver hash, é uma rota SPA
    if (hash && hash.startsWith('#/')) {
        handleSPARoute(hash);
    } 
    // Se for página inicial
    else if (isHomePage()) {
        showHomePage();
        showCarousel(); // MOSTRAR CARROSSEL APENAS NA HOME
    }
    // Se for rota de obras
    else if (path.includes('/obras/')) {
        handleMangaRoute(path);
    }
    else {
        showHomePage();
        if (isHomePage()) {
            showCarousel(); // MOSTRAR CARROSSEL APENAS NA HOME
        }
    }
}

// Manipular rotas SPA com hash
function handleSPARoute(hash) {
    const route = hash.substring(2);
    const routeParts = route.split('/').filter(part => part !== '');
    
    console.log('Rota SPA:', routeParts);
    
    if (routeParts.length === 0) {
        showHomePage();
        showCarousel(); // MOSTRAR CARROSSEL APENAS NA HOME
    } else if (routeParts[0] === 'obras') {
        if (routeParts.length === 1) {
            showHomePage();
            showCarousel(); // MOSTRAR CARROSSEL APENAS NA HOME
        } else if (routeParts.length === 2) {
            showMangaDetailPage(routeParts[1]);
        } else if (routeParts.length === 3) {
            showMangaReaderPage(routeParts[1], routeParts[2]);
        } else {
            showNotFound();
        }
    } else {
        showNotFound();
    }
}

// Manipular rotas de mangá (URLs normais)
function handleMangaRoute(path) {
    const pathParts = path.split('/').filter(part => part !== '');
    
    if (pathParts.length === 2 && pathParts[0] === 'obras') {
        showMangaDetailPage(pathParts[1]);
    } else if (pathParts.length === 3 && pathParts[0] === 'obras') {
        showMangaReaderPage(pathParts[1], pathParts[2]);
    } else {
        showNotFound();
    }
}

// Inicializar sistema de autenticação
function initializeAuth() {
    console.log('Inicializando autenticação...');
    
    const userData = localStorage.getItem('discordUser');
    const user = userData ? JSON.parse(userData) : null;
    
    if (user) {
        console.log('Usuário encontrado no localStorage:', user.username);
        updateUIForLoggedUser(user);
                
        // --- ADICIONE ESTA LINHA AQUI ---
        checkVipStatus(); 
        // --------------------------------
    } else {
        console.log('Nenhum usuário logado');
        showLoginSection();
    }
}

// Mostrar seção de login
function showLoginSection() {
    const accountSection = document.getElementById('accountSection');
    if (accountSection) {
        accountSection.innerHTML = `
            <h3><i class="fas fa-user"></i> Minha Conta</h3>
            <button class="sidebar-btn" onclick="loginWithDiscord()">
                <i class="fab fa-discord"></i> Entrar com Discord
            </button>
            <button class="sidebar-btn" onclick="openRequestForm()">
                <i class="fas fa-book-medical"></i> Pedir Tradução
            </button>
            <button class="sidebar-btn" onclick="viewProfile()">
                <i class="fas fa-id-card"></i> Meu Perfil
            </button>
        `;
    }
}

// Inicializar cache de imagens
function initializeCache() {
    console.log('Cache de imagens inicializado');
}

// Configurar event listeners
function setupEventListeners() {
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.onclick = closeModal;
    }
    
    window.onclick = function(event) {
        const modal = document.getElementById('mangaModal');
        if (event.target === modal) {
            closeModal();
        }
        
        const requestModal = document.getElementById('requestModal');
        if (event.target === requestModal) {
            closeRequestForm();
        }
        
        // NÃO fechar modal de download ao clicar fora (removido)
    }

    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', handleSearchKeypress);
    }
    
    document.addEventListener('keydown', function(event) {
        const reader = document.getElementById('mangaReader');
        if (reader && reader.style.display === 'block') {
            if (event.key === 'Escape') {
                closeReader();
            }
        }
        
        const sidebar = document.getElementById('sidebarModal');
        if (sidebar && sidebar.classList.contains('open') && event.key === 'Escape') {
            toggleSidebar();
        }
        
        const downloadModal = document.getElementById('downloadModal');
        if (downloadModal && downloadModal.style.display === 'block' && event.key === 'Escape') {
            closeDownloadModal();
        }
    });
    
    // Configurar formulário de tradução
    const translationForm = document.getElementById('translationRequestForm');
    if (translationForm) {
        translationForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const user = checkAuth();
            if (!user) {
                showToast('<i class="fas fa-exclamation-triangle"></i> Faça login primeiro!');
                return;
            }
            
            const submitBtn = this.querySelector('.btn-submit');
            const originalText = submitBtn.innerHTML;
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
            submitBtn.disabled = true;
            this.classList.add('loading');
            
            const formData = {
                manga_name: document.getElementById('mangaName').value,
                manga_link: document.getElementById('mangaLink').value,
                user_name: document.getElementById('userName').value,
                user_email: document.getElementById('userEmail').value || 'Não informado',
                discord_user: `${user.username}#${user.discriminator}`,
                discord_id: user.id,
                timestamp: new Date().toLocaleString('pt-BR')
            };
            
            emailjs.send('service_739576a', 'template_8k5yeyj', formData)
                .then(function(response) {
                    showToast('<i class="fas fa-check-circle"></i> Solicitação enviada com sucesso!');
                    closeRequestForm();
                })
                .catch(function(error) {
                    console.error('Erro ao enviar email:', error);
                    showToast('<i class="fas fa-exclamation-triangle"></i> Erro ao enviar solicitação. Tente novamente.');
                })
                .finally(function() {
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                    document.getElementById('translationRequestForm').classList.remove('loading');
                });
        });
    }
}

// Sistema de pré-carregamento
function preloadImage(url) {
    return new Promise((resolve) => {
        if (imageCache.has(url)) {
            resolve(imageCache.get(url));
            return;
        }

        const img = new Image();
        
        img.onload = function() {
            imageCache.set(url, true);
            resolve(true);
        };
        
        img.onerror = function() {
            console.warn('Erro ao carregar imagem:', url);
            resolve(false);
        };
        
        img.src = url;
    });
}

// ===============================
// SISTEMA DE AUTENTICAÇÃO DISCORD
// ===============================

// Função de login com Discord - CORRIGIDA
function loginWithDiscord() {
    console.log('Iniciando login com Discord...');
    
    // URL CORRETA - sem hash routing para OAuth
    const DISCORD_REDIRECT_URI = "https://mangatachi.vercel.app/auth.html";
    const DISCORD_CLIENT_ID = "1437114497050345613";
    const DISCORD_SCOPE = "identify email";
    
    const authUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=token&scope=${encodeURIComponent(DISCORD_SCOPE)}`;
    
    console.log('Redirecionando para:', authUrl);
    window.location.href = authUrl;
}

// Verificar se usuário está logado
function checkAuth() {
    const userData = localStorage.getItem('discordUser');
    if (userData) {
        return JSON.parse(userData);
    }
    return null;
}

// Atualizar UI quando usuário loga
function updateUIForLoggedUser(user) {
    console.log('Atualizando UI para usuário logado:', user.username);
    
    const accountSection = document.getElementById('accountSection');
    if (!accountSection) {
        console.error('Seção de conta não encontrada!');
        return;
    }
    
    accountSection.innerHTML = `
        <h3><i class="fas fa-user"></i> Meu Perfil</h3>
        <div class="user-profile">
            <img src="${user.avatar ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` : 'https://cdn.discordapp.com/embed/avatars/0.png'}" 
                 alt="Avatar" class="user-avatar">
            <h4>${user.global_name || user.username}</h4>
            <p class="user-discord-tag">${user.username}#${user.discriminator}</p>
            <p class="user-email">${user.email || 'Email não público'}</p>
        </div>
        <button class="sidebar-btn" onclick="openRequestForm()" style="margin-top: 10px;">
            <i class="fas fa-book-medical"></i> Pedir Tradução
        </button>
        <button class="sidebar-btn" onclick="viewProfile()" style="margin-top: 5px;">
            <i class="fas fa-id-card"></i> Meu Perfil
        </button>
        <button class="sidebar-btn" onclick="logout()" style="margin-top: 5px; background: #dc3545; border-left-color: #dc3545;">
            <i class="fas fa-sign-out-alt"></i> Sair
        </button>
    `;
    
    console.log('UI atualizada com sucesso');
}

// Função para ver perfil
function viewProfile() {
    const user = checkAuth();
    if (user) {
        window.location.href = 'perfil.html';
    } else {
        showToast('<i class="fas fa-info-circle"></i> Faça login com Discord para ver seu perfil!');
    }
    toggleSidebar();
}

// Logout
function logout() {
    console.log('Fazendo logout...');
    localStorage.removeItem('discordUser');
    localStorage.removeItem('discordToken');
    showToast('<i class="fas fa-info"></i> Logout realizado.');
    
    setTimeout(() => {
        location.reload();
    }, 1000);
}

// ===============================
// FUNÇÕES PRINCIPAIS DO SITE
// ===============================

// Mostrar página inicial
function showHomePage() {
    console.log('Mostrando página inicial');
    loadHomeSections();
    initializeAuth();
    showMainContent();
    showHeaderElements();
}

// Buscar mangás (função original mantida para compatibilidade)
function searchManga() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    const sectionsContainer = document.getElementById('sectionsContainer');
    const mangaGridContainer = document.getElementById('mangaGridContainer');
    const mangaGrid = document.getElementById('mangaGrid');
    
    if (!sectionsContainer || !mangaGridContainer || !mangaGrid) return;
    
    if (searchTerm === '') {
        loadHomeSections();
        return;
    }

    const filteredMangas = mangas.filter(manga => 
        manga.title.toLowerCase().includes(searchTerm) ||
        manga.author.toLowerCase().includes(searchTerm) ||
        manga.genres.some(genre => genre.toLowerCase().includes(searchTerm))
    );

    sectionsContainer.style.display = 'none';
    mangaGridContainer.style.display = 'block';
    mangaGrid.innerHTML = '';

    if (filteredMangas.length === 0) {
        mangaGrid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <div style="font-size: 3rem; margin-bottom: 1rem; color: var(--text-gray);">
                    <i class="fas fa-book-open"></i>
                </div>
                <h3 style="color: var(--text-gray); margin-bottom: 0.5rem;">Nenhum mangá encontrado</h3>
                <p style="color: var(--text-gray);">Tente buscar por título, autor ou gênero</p>
            </div>
        `;
        return;
    }

    filteredMangas.forEach(manga => {
        const mangaCard = document.createElement('div');
        mangaCard.className = `manga-card ${currentView === 'list' ? 'list-view' : ''}`;
        mangaCard.onclick = () => showMangaDetails(manga.id);

        const statusClass = manga.status === 'Em andamento' || manga.status === 'Ongoing' ? 'status-ongoing' : 'status-complete';
        
        mangaCard.innerHTML = `
            <img src="${manga.coverUrl}" alt="${manga.title}" class="manga-cover" loading="lazy">
            <div class="manga-info">
                <h3 class="manga-title">${manga.title}</h3>
                <p class="manga-author">
                    <i class="fas fa-user-pen"></i> ${manga.author}
                </p>
                <div class="manga-meta">
                    <span class="status-badge ${statusClass}">
                        <i class="fas ${(manga.status === 'Em andamento' || manga.status === 'Ongoing') ? 'fa-spinner' : 'fa-check'}"></i> 
                        ${manga.status}
                    </span>
                    <span><i class="fas fa-book"></i> ${getTotalChapters(manga)}</span>
                </div>
            </div>
        `;

        mangaGrid.appendChild(mangaCard);
    });
}

// Tecla Enter na busca
function handleSearchKeypress(event) {
    if (event.key === 'Enter') {
        searchManga();
    }
}

// Carregar seções da tela inicial
function loadHomeSections() {
    const sectionsContainer = document.getElementById('sectionsContainer');
    const mangaGridContainer = document.getElementById('mangaGridContainer');
    
    if (!sectionsContainer || !mangaGridContainer) return;
    
    sectionsContainer.style.display = 'block';
    mangaGridContainer.style.display = 'none';
    sectionsContainer.innerHTML = '';
    
    const featuredSection = document.createElement('div');
    featuredSection.className = 'section-card';
    featuredSection.innerHTML = `
        <div class="section-header">
            <h2><i class="fas fa-star"></i> Novos títulos populares</h2>
        </div>
        <div class="featured-mangas">
            ${generateFeaturedMangas()}
        </div>
    `;
    sectionsContainer.appendChild(featuredSection);
}

// Gerar mangás em destaque
function generateFeaturedMangas() {
    const featuredMangas = mangas.slice(0, 10);
    
    return featuredMangas.map(manga => {
        const statusClass = manga.status === 'Em andamento' || manga.status === 'Ongoing' ? 'status-ongoing' : 'status-complete';
        const totalChapters = getTotalChapters(manga);
        
        return `
            <div class="manga-card" onclick="showMangaDetails(${manga.id})">
                <img src="${manga.coverUrl}" alt="${manga.title}" class="manga-cover" loading="lazy">
                <div class="manga-info">
                    <h3 class="manga-title">${manga.title}</h3>
                    <p class="manga-author">
                        <i class="fas fa-user-pen"></i> ${manga.author}
                    </p>
                    <div class="manga-meta">
                        <span class="status-badge ${statusClass}">
                            <i class="fas ${(manga.status === 'Em andamento' || manga.status === 'Ongoing') ? 'fa-spinner' : 'fa-check'}"></i> 
                            ${manga.status}
                        </span>
                        <span><i class="fas fa-book"></i> ${totalChapters} capítulos</span>
                    </div>
                    ${manga.genres && manga.genres.length > 0 ? `
                        <div class="manga-genres">
                            ${manga.genres.slice(0, 3).map(genre => `<span class="genre-tag-small">${genre}</span>`).join('')}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Mostrar conteúdo principal
function showMainContent() {
    const sectionsContainer = document.getElementById('sectionsContainer');
    const mangaGridContainer = document.getElementById('mangaGridContainer');
    
    if (sectionsContainer) sectionsContainer.style.display = 'block';
    if (mangaGridContainer) mangaGridContainer.style.display = 'none';
}

// Mudar visualização
function changeView(view) {
    currentView = view;
    
    document.querySelectorAll('.view-toggle').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
    
    loadHomeSections();
}

// Obter total de capítulos - VERSÃO CORRIGIDA
function getTotalChapters(manga) {
    let count = 0;
    if (manga.oneshot) count += manga.oneshot.length;
    if (manga.chapters) count += manga.chapters.length;
    if (manga.volumes) {
        manga.volumes.forEach(volume => {
            if (volume.chapters) {
                count += volume.chapters.length;
            }
        });
    }
    return count;
}

// ===============================
// SISTEMA DE SIDEBAR
// ===============================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebarModal');
    const overlay = document.getElementById('sidebarOverlay');
    const body = document.body;
    
    if (!sidebar || !overlay) return;
    
    if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        body.classList.remove('sidebar-open');
    } else {
        sidebar.classList.add('open');
        overlay.classList.add('active');
        body.classList.add('sidebar-open');
    }
}

// ===============================
// SISTEMA DE ROTAS SPA
// ===============================

// Mostrar detalhes do mangá
function showMangaDetails(mangaId) {
    const manga = mangas.find(m => m.id === mangaId);
    if (!manga) {
        showToast('<i class="fas fa-exclamation-triangle"></i> Mangá não encontrado');
        return;
    }

    hideCarousel();
    const mangaUrl = generateMangaUrl(manga);
    navigateToSPA(mangaUrl);
}

// Abrir leitor - VERSÃO CORRIGIDA
function openReader(type, mangaId, ...params) {
    const manga = mangas.find(m => m.id === mangaId);
    if (!manga) {
        showToast('<i class="fas fa-exclamation-triangle"></i> Mangá não encontrado');
        return;
    }
    
    let chapter = null;
    let chapterNumber = null;
    
    if (type === 'oneshot') {
        chapter = manga.oneshot[0];
        chapterNumber = 'oneshot';
    } else if (type === 'chapter') {
        // Procura primeiro em chapters direto
        if (manga.chapters) {
            chapter = manga.chapters.find(c => c.chapterNumber === params[0]);
        }
        // Se não encontrou, procura em volumes
        if (!chapter && manga.volumes) {
            for (const volume of manga.volumes) {
                if (volume.chapters) {
                    chapter = volume.chapters.find(c => c.chapterNumber === params[0]);
                    if (chapter) break;
                }
            }
        }
        chapterNumber = params[0];
    }

    if (!chapter || !chapter.pages || chapter.pages.length === 0) {
        showToast('<i class="fas fa-exclamation-triangle"></i> Capítulo não encontrado ou sem páginas');
        return;
    }

    const readerUrl = generateChapterUrl(manga, chapterNumber);
    navigateToSPA(readerUrl);
}

// Navegação SPA com hash
function navigateToSPA(url) {
    window.location.hash = `#${url}`;
}

// Função para gerar URL de mangá
function generateMangaUrl(manga) {
    const slug = slugify(manga.title);
    return `/obras/${slug}`;
}

// Função para gerar URL de capítulo
function generateChapterUrl(manga, chapterNumber) {
    const slug = slugify(manga.title);
    return `/obras/${slug}/${chapterNumber}`;
}

// Função para criar slug
function slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
}

// ===============================
// SISTEMA DE PÁGINAS SPA - ATUALIZADO
// ===============================

// Mostrar página de detalhes do mangá (SPA) - AGORA SEM BOTÃO DE DOWNLOAD GRANDE
function showMangaDetailPage(mangaSlug) {
    const manga = findMangaBySlug(mangaSlug);
    if (!manga) {
        showNotFound();
        return;
    }

    hideHeaderElements();
    hideMainContent();
    hideCarousel(); // GARANTIR QUE CARROSSEL ESTEJA ESCONDIDO
    
    const mangaDetailHTML = generateMangaDetailHTML(manga);
    document.getElementById('sectionsContainer').innerHTML = mangaDetailHTML;
    
    setupMangaDetailEvents(manga);
    initializeLikes(manga.id);
}

// Mostrar página do leitor (SPA)
function showMangaReaderPage(mangaSlug, chapterNumber) {
    const manga = findMangaBySlug(mangaSlug);
    if (!manga) {
        showNotFound();
        return;
    }

    const chapter = findChapter(manga, chapterNumber);
    if (!chapter) {
        showNotFound();
        return;
    }

    hideHeaderElements();
    hideMainContent();
    hideCarousel(); // GARANTIR QUE CARROSSEL ESTEJA ESCONDIDO
    
    const readerHTML = generateMangaReaderHTML(manga, chapter);
    document.getElementById('sectionsContainer').innerHTML = readerHTML;
    
    setupMangaReaderEvents(manga, chapter);
}

// Esconder conteúdo principal
function hideMainContent() {
    const sectionsContainer = document.getElementById('sectionsContainer');
    const mangaGridContainer = document.getElementById('mangaGridContainer');
    
    if (sectionsContainer) sectionsContainer.style.display = 'block';
    if (mangaGridContainer) mangaGridContainer.style.display = 'none';
}

// Encontrar mangá por slug
function findMangaBySlug(slug) {
    return mangas.find(manga => slugify(manga.title) === slug);
}

// Encontrar capítulo - VERSÃO CORRIGIDA
function findChapter(manga, chapterNumber) {
    if (chapterNumber === 'oneshot' && manga.oneshot) {
        return manga.oneshot[0];
    }
    
    // Primeiro procura em chapters direto
    if (manga.chapters) {
        const chapter = manga.chapters.find(c => c.chapterNumber == chapterNumber);
        if (chapter) return chapter;
    }
    
    // Se não encontrou, procura em volumes
    if (manga.volumes) {
        for (const volume of manga.volumes) {
            if (volume.chapters) {
                const chapter = volume.chapters.find(c => c.chapterNumber == chapterNumber);
                if (chapter) return chapter;
            }
        }
    }
    
    return null;
}

// Gerar HTML da página de detalhes (SPA) - COM SISTEMA AUTOMÁTICO DE DIREITOS AUTORAIS
function generateMangaDetailHTML(manga) {
    const totalChapters = getTotalChapters(manga);
    const slug = slugify(manga.title);
    
    return `
        <div class="manga-detail-spa">
            <div class="section-card">
                <div class="section-header">
                    <button onclick="goBackToHome()" class="btn-back" style="margin-right: 1rem;">
                        <i class="fas fa-arrow-left"></i> Voltar
                    </button>
                    <h2>${manga.title}</h2>
                </div>
                
                <div class="manga-detail-content">
                    <div class="manga-detail-main">
                        <img src="${manga.coverUrl}" alt="${manga.title}" class="manga-detail-cover" loading="lazy">
                        
                        <div class="manga-detail-info">
                            <!-- SEÇÃO DE DIREITOS AUTORAIS AUTOMÁTICA -->
                            ${generateCopyrightSection(manga)}
                            <!-- FIM DOS DIREITOS AUTORAIS -->

                            <div class="manga-detail-meta">
                                <div class="meta-item">
                                    <i class="fas fa-user-pen"></i>
                                    <span><strong>Autor:</strong> ${manga.author}</span>
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-chart-line"></i>
                                    <span><strong>Status:</strong> ${manga.status}</span>
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-users"></i>
                                    <span><strong>Equipe:</strong> ${manga.translationTeam}</span>
                                </div>
                                <div class="meta-item">
                                    <i class="fas fa-book"></i>
                                    <span><strong>Capítulos:</strong> ${totalChapters}</span>
                                </div>
                            </div>
                            
                            <div class="genres">
                                ${manga.genres.map(genre => `<span class="genre-tag">${genre}</span>`).join('')}
                            </div>
                            
                            <!-- SISTEMA DE CURTIDAS (ESTILO YOUTUBE) -->
                            ${generateLikeButton(manga)}
                            
                            <div class="manga-description">
                                <h3><i class="fas fa-file-text"></i> Sinopse</h3>
                                <p>${manga.description}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div class="chapters-section">
                        <h3><i class="fas fa-book"></i> Capítulos Disponíveis</h3>
                        <div class="chapter-grid-spa">
                            ${generateChapterCardsSPA(manga, slug)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Gerar cards de capítulos (SPA) - VERSÃO CORRIGIDA
function generateChapterCardsSPA(manga, slug) {
    let chaptersHTML = '';
    let allChapters = [];
    
    // Coletar todos os capítulos de todas as fontes
    if (manga.oneshot) allChapters.push(...manga.oneshot);
    if (manga.chapters) allChapters.push(...manga.chapters);
    if (manga.volumes) {
        manga.volumes.forEach(volume => {
            if (volume.chapters) {
                allChapters.push(...volume.chapters);
            }
        });
    }
    
    // Ordenar capítulos (oneshot primeiro, depois por número decrescente)
    allChapters.sort((a, b) => {
        if (a.type === 'oneshot') return -1;
        if (b.type === 'oneshot') return 1;
        return b.chapterNumber - a.chapterNumber;
    });
    
    allChapters.forEach(chapter => {
        const chapterNum = chapter.type === 'oneshot' ? 'oneshot' : chapter.chapterNumber;
        
        chaptersHTML += `
            <div class="chapter-card-spa" onclick="openReader('${chapter.type}', ${manga.id}, ${chapter.type === 'oneshot' ? '' : chapter.chapterNumber})">
                <div class="chapter-info">
                    <div class="chapter-title">
                        ${chapter.type === 'oneshot' ? 
                            `<i class="fas fa-bullseye"></i> Oneshot` : 
                            `<i class="fas fa-book"></i> Capítulo ${chapter.chapterNumber}`
                        }
                    </div>
                    ${chapter.title && chapter.type !== 'oneshot' ? 
                        `<div class="chapter-subtitle">${chapter.title}</div>` : 
                        ''
                    }
                    <div class="chapter-meta">
                        <i class="fas fa-file-image"></i> ${chapter.pages ? chapter.pages.length : 0} páginas
                    </div>
                </div>
                ${checkDownloadAvailability(manga.id) && chapter.type !== 'oneshot' ? `
                    <button class="download-btn-small" onclick="event.stopPropagation(); downloadChapter(${manga.id}, ${chapter.chapterNumber})">
                        <i class="fas fa-download"></i>
                    </button>
                ` : '<i class="fas fa-chevron-right"></i>'}
            </div>
        `;
    });
    
    if (!chaptersHTML) {
        chaptersHTML = `
            <div class="no-chapters">
                <i class="fas fa-exclamation-circle"></i>
                <p>Nenhum capítulo disponível</p>
            </div>
        `;
    }
    
    return chaptersHTML;
}

// Gerar HTML do leitor (SPA)
function generateMangaReaderHTML(manga, chapter) {
    const slug = slugify(manga.title);
    const chapterTitle = chapter.type === 'oneshot' ? 'Oneshot' : `Capítulo ${chapter.chapterNumber}`;
    
    return `
        <div class="manga-reader-spa">
            <div class="reader-header-spa">
                <button onclick="goBackToManga('${slug}')" class="btn-back">
                    <i class="fas fa-arrow-left"></i> Voltar
                </button>
                <h3>${manga.title} - ${chapterTitle}</h3>
            </div>
            <div class="reader-content-spa" id="readerContent">
                <div class="manga-pages-container">
                    ${chapter.pages.map((pageUrl, index) => `
                        <img src="${pageUrl}" alt="Página ${index + 1} de ${manga.title}" class="manga-page" loading="lazy">
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

// Voltar para a página inicial
function goBackToHome() {
    cleanupReaderScrollSystem();
    showHeaderElements();
    navigateToSPA('/');
    updateFixedBackButton(); // Atualizar botão quando a hash mudar
}

// Voltar para a página do mangá
function goBackToManga(mangaSlug) {
    cleanupReaderScrollSystem();
    const mangaUrl = `/obras/${mangaSlug}`;
    navigateToSPA(mangaUrl);
    updateFixedBackButton(); // Atualizar botão quando a hash mudar
}

// Configurar eventos da página de detalhes
function setupMangaDetailEvents(manga) {
    console.log('Página de detalhes carregada:', manga.title);
}

// Configurar eventos do leitor
function setupMangaReaderEvents(manga, chapter) {
    console.log('Leitor carregado:', manga.title, 'Capítulo:', chapter.chapterNumber || 'Oneshot');
    
    // Configurar sistema de scroll
    setTimeout(() => {
        setupReaderScrollSystem();
    }, 500);
    
    setTimeout(() => {
        chapter.pages.forEach((pageUrl, index) => {
            if (index < chapter.pages.length - 1) {
                preloadImage(chapter.pages[index + 1]);
            }
        });
    }, 1000);
}

// Mostrar página não encontrada
function showNotFound() {
    hideMainContent();
    showHeaderElements();
    showCarousel();
    
    const sectionsContainer = document.getElementById('sectionsContainer');
    if (sectionsContainer) {
        sectionsContainer.innerHTML = `
            <div class="section-card">
                <div style="text-align: center; padding: 4rem;">
                    <div style="font-size: 4rem; color: var(--text-gray); margin-bottom: 1rem;">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <h2 style="color: var(--text-light); margin-bottom: 1rem;">Página não encontrada</h2>
                    <p style="color: var(--text-gray); margin-bottom: 2rem;">O mangá que você está procurando não existe ou foi removido.</p>
                    <button onclick="goBackToHome()" class="btn-submit">
                        <i class="fas fa-home"></i> Voltar para a página inicial
                    </button>
                </div>
            </div>
        `;
    }
}

// ===============================
// FUNÇÕES DO SIDEBAR E FORMULÁRIO
// ===============================

function openRequestForm() {
    const user = checkAuth();
    if (!user) {
        showToast('<i class="fas fa-exclamation-triangle"></i> Faça login com Discord primeiro!');
        toggleSidebar();
        return;
    }
    
    closeModal();
    toggleSidebar();
    hideCarousel();
    
    const requestModal = document.getElementById('requestModal');
    if (requestModal) {
        requestModal.style.display = 'block';
    }
    
    const userName = document.getElementById('userName');
    const userEmail = document.getElementById('userEmail');
    
    if (userName) userName.value = user.global_name || user.username;
    if (userEmail) userEmail.value = user.email || '';
}

function closeRequestForm() {
    const requestModal = document.getElementById('requestModal');
    if (requestModal) {
        requestModal.style.display = 'none';
    }
    
    const form = document.getElementById('translationRequestForm');
    if (form) {
        form.reset();
    }
    
    // REMOVER showCarousel() daqui - só mostrar se for home
    if (isHomePage()) {
        showCarousel();
    }
}

// Fechar sidebar ao clicar fora
document.addEventListener('click', function(event) {
    const sidebar = document.getElementById('sidebarModal');
    const hamburgerBtn = document.querySelector('.hamburger-btn');
    const overlay = document.getElementById('sidebarOverlay');
    
    if (sidebar && sidebar.classList.contains('open') && 
        !sidebar.contains(event.target) && 
        (!hamburgerBtn || !hamburgerBtn.contains(event.target)) &&
        event.target !== overlay) {
        toggleSidebar();
    }
});

// Handle browser back/forward buttons and hash changes
window.addEventListener('popstate', function(event) {
    processCurrentRoute();
});

// Handle hash changes for SPA
window.addEventListener('hashchange', function(event) {
    processCurrentRoute();
    updateFixedBackButton(); // Atualizar botão quando a hash mudar
});

// ===============================
// FUNÇÕES AUXILIARES DE DOWNLOAD
// ===============================

// Função auxiliar para verificar disponibilidade de download (usada na geração da página)
function checkDownloadAvailability(mangaId) {
    return typeof downloadHasChapters === 'function' && downloadHasChapters(mangaId);
}

// Função auxiliar para obter informações do mangá (CORRIGIDA)
function getMangaDownloadInfo(mangaId) {
    if (typeof window.getMangaDownloadInfo === 'function') {
        return window.getMangaDownloadInfo(mangaId);
    }
    
    // Fallback
    if (typeof mangaDownloads !== 'undefined' && mangaDownloads[mangaId]) {
        return mangaDownloads[mangaId];
    }
    
    return null;
}

// Função auxiliar para verificar se o sistema de download está carregado
function isDownloadSystemReady() {
    return typeof downloadHasChapters === 'function' && 
           typeof downloadGetChapters === 'function' &&
           typeof downloadGetChapterLink === 'function' &&
           typeof downloadGetMangaInfo === 'function';
}

// Inicializar sistema de download
function initializeDownloadSystem() {
    if (!isDownloadSystemReady()) {
        console.warn('Sistema de download não está totalmente carregado');
    } else {
        console.log('✅ Sistema de download inicializado com sucesso');
    }
}

// ===============================
// INICIALIZAÇÃO FINAL - CORRIGIDA
// ===============================

// Garantir que o carrossel esteja visível apenas se for a página inicial
document.addEventListener('DOMContentLoaded', function() {
    // Primeiro processar a rota atual
    processCurrentRoute();
    
    // Depois, se for home page, mostrar carrossel
    if (isHomePage()) {
        setTimeout(() => {
            showCarousel();
        }, 100);
    }
});

// ===== FUNÇÃO PARA GERAR URL DE COMPARTILHAMENTO =====
function generateShareUrl(manga, chapter = null) {
    const slug = manga.title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
    
    let shareUrl = `https://mangatachi.vercel.app/?manga=${slug}`;
    
    if (chapter) {
        shareUrl += `&chapter=${chapter.chapterNumber}`;
    }
    
    return shareUrl;
}

// ===== ATUALIZAR OS BOTÕES DE COMPARTILHAMENTO =====
function setupShareButtons(manga, chapter = null) {
    const shareUrl = generateShareUrl(manga, chapter);
    
    // Exemplo: adicionar botão de compartilhar na página de detalhes
    console.log('🔗 URL para compartilhar:', shareUrl);
    
    // Você pode adicionar um botão de compartilhamento no HTML:
    // <button onclick="shareManga()" class="share-btn">
    //     <i class="fas fa-share"></i> Compartilhar
    // </button>
}

// ===== FUNÇÃO DE COMPARTILHAMENTO =====
function shareManga() {
    if (currentManga) {
        const shareUrl = generateShareUrl(currentManga, currentChapter);
        
        if (navigator.share) {
            // Compartilhamento nativo (mobile)
            navigator.share({
                title: currentManga.title,
                text: currentChapter ? 
                    `Leia o Capítulo ${currentChapter.chapterNumber} de ${currentManga.title}` :
                    `Leia ${currentManga.title}`,
                url: shareUrl
            });
        } else {
            // Fallback: copiar para área de transferência
            navigator.clipboard.writeText(shareUrl).then(() => {
                showToast('<i class="fas fa-link"></i> Link copiado! Cole no WhatsApp');
            });
        }
    }
}

// ===== CORREÇÃO PARA PARÂMETROS DE URL (COMPARTILHAMENTO) =====
function processURLParameters() {
    const urlParams = new URLSearchParams(window.location.search);
    const mangaParam = urlParams.get('manga');
    const chapterParam = urlParams.get('chapter');
    
    if (mangaParam) {
        console.log('🎯 Detectado parâmetro de compartilhamento manga:', mangaParam);
        console.log('📖 Capítulo:', chapterParam);
        
        // Aguardar o carregamento dos dados dos mangás
        if (typeof mangas !== 'undefined') {
            processSharedManga(mangaParam, chapterParam);
        } else {
            // Se mangas ainda não carregou, esperar um pouco
            setTimeout(() => {
                if (typeof mangas !== 'undefined') {
                    processSharedManga(mangaParam, chapterParam);
                }
            }, 500);
        }
    }
}

// Processar mangá compartilhado via URL
function processSharedManga(mangaSlug, chapterNumber = null) {
    const manga = findMangaBySlug(mangaSlug);
    
    if (manga) {
        console.log('✅ Mangá encontrado via compartilhamento:', manga.title);
        
        // Navegar para a página do mangá após um pequeno delay
        setTimeout(() => {
            if (chapterNumber) {
                // Navegar para o capítulo específico
                const readerUrl = generateChapterUrl(manga, chapterNumber);
                navigateToSPA(readerUrl);
            } else {
                // Navegar para a página de detalhes do mangá
                const mangaUrl = generateMangaUrl(manga);
                navigateToSPA(mangaUrl);
            }
        }, 300);
    } else {
        console.log('❌ Mangá não encontrado para slug:', mangaSlug);
    }
}

// Executar processamento de parâmetros na inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Processar parâmetros de URL (compartilhamento)
    processURLParameters();
});

// Sistema avançado de Lazy Loading
function initializeLazyLoading() {
    const lazyImages = [].slice.call(document.querySelectorAll('img[data-src]'));
    
    if ('IntersectionObserver' in window) {
        let lazyImageObserver = new IntersectionObserver(function(entries, observer) {
            entries.forEach(function(entry) {
                if (entry.isIntersecting) {
                    let lazyImage = entry.target;
                    lazyImage.src = lazyImage.dataset.src;
                    lazyImage.classList.remove('lazy');
                    lazyImageObserver.unobserve(lazyImage);
                }
            });
        });

        lazyImages.forEach(function(lazyImage) {
            lazyImageObserver.observe(lazyImage);
        });
    } else {
        // Fallback para browsers antigos
        lazyImages.forEach(function(lazyImage) {
            lazyImage.src = lazyImage.dataset.src;
        });
    }
}

// ===============================
// ESTILOS CSS PARA OS CRÉDITOS (ADICIONADOS DINAMICAMENTE)
// ===============================

document.addEventListener('DOMContentLoaded', function() {
    // Adicionar estilos CSS para os créditos
    const creditStyles = `
        <style>
            .credit-notice {
                background: linear-gradient(135deg, rgba(30, 136, 229, 0.1), rgba(66, 165, 245, 0.05));
                border: 1px solid rgba(30, 136, 229, 0.3);
                border-radius: 8px;
                padding: 1rem;
                margin: 1.5rem 0;
                font-size: 0.9rem;
            }
            
            .credit-header {
                display: flex;
                align-items: center;
                gap: 0.5rem;
                margin-bottom: 0.8rem;
                color: var(--primary-color);
            }
            
            .credit-header h4 {
                margin: 0;
                font-size: 1rem;
            }
            
            .credit-content p {
                margin: 0.3rem 0;
                line-height: 1.4;
            }
            
            .credit-content .disclaimer {
                margin-top: 0.8rem;
                padding-top: 0.8rem;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                font-style: italic;
                color: var(--text-gray);
                display: flex;
                align-items: flex-start;
                gap: 0.5rem;
            }
            
            .credit-content a {
                color: var(--primary-color);
                text-decoration: none;
            }
            
            .credit-content a:hover {
                text-decoration: underline;
            }
            
            @media (max-width: 768px) {
                .credit-notice {
                    margin: 1rem 0;
                    padding: 0.8rem;
                }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', creditStyles);
});


// ===============================
// SISTEMA DE TEMA CLARO/ESCURO
// ===============================

// Inicializar tema
function initializeTheme() {
    const savedTheme = localStorage.getItem('mangaTheme') || 'light';
    setTheme(savedTheme);
    updateThemeButton(savedTheme);
}

// Alternar tema
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    setTheme(newTheme);
    updateThemeButton(newTheme);
    saveTheme(newTheme);
    showThemeToast(newTheme);
}

// Aplicar tema
function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    
    // Atualizar meta tag theme-color para mobile
    const themeColor = theme === 'light' ? '#f5f5f5' : '#000000';
    document.querySelector('meta[name="theme-color"]').setAttribute('content', themeColor);
}

// Atualizar botão do tema
function updateThemeButton(theme) {
    const themeButton = document.querySelector('.sidebar-btn[onclick="toggleTheme()"]');
    const themeInfo = document.getElementById('currentTheme');
    
    if (themeButton && themeInfo) {
        if (theme === 'light') {
            themeButton.innerHTML = '<i class="fas fa-moon theme-icon"></i> Alternar para Escuro';
            themeInfo.textContent = 'Tema atual: Claro';
        } else {
            themeButton.innerHTML = '<i class="fas fa-sun theme-icon"></i> Alternar para Claro';
            themeInfo.textContent = 'Tema atual: Escuro';
        }
    }
}

// Salvar tema no localStorage
function saveTheme(theme) {
    localStorage.setItem('mangaTheme', theme);
}

// Mostrar toast de confirmação do tema
function showThemeToast(theme) {
    const themeName = theme === 'light' ? 'Claro' : 'Escuro';
    showToast(`<i class="fas fa-palette"></i> Tema ${themeName} ativado`);
}

// Atualizar a função initializeAuth para incluir o tema
function initializeAuth() {
    console.log('Inicializando autenticação...');
    
    const userData = localStorage.getItem('discordUser');
    const user = userData ? JSON.parse(userData) : null;
    
    if (user) {
        console.log('Usuário encontrado no localStorage:', user.username);
        updateUIForLoggedUser(user);
    } else {
        console.log('Nenhum usuário logado');
        showLoginSection();
    }
    
    // Inicializar tema
    initializeTheme();
}

// ===============================
// ESTILOS CSS PARA O SISTEMA DE BUSCA
// ===============================

document.addEventListener('DOMContentLoaded', function() {
    const searchStyles = `
        <style>
            .search-results-container {
                position: absolute;
                top: 100%;
                left: 0;
                right: 0;
                background: var(--background-card);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-height: 400px;
                overflow-y: auto;
                z-index: 1000;
                display: none;
                margin-top: 8px;
                backdrop-filter: blur(20px);
            }
            
            .search-result-item {
                display: flex;
                align-items: center;
                padding: 12px 16px;
                border-bottom: 1px solid var(--border-color);
                cursor: pointer;
                transition: all 0.2s ease;
                gap: 12px;
            }
            
            .search-result-item:last-child {
                border-bottom: none;
            }
            
            .search-result-item:hover {
                background: var(--background-hover);
            }
            
            .search-result-item.loading {
                justify-content: center;
                color: var(--text-gray);
            }
            
            .search-result-item.no-results {
                justify-content: flex-start;
                color: var(--text-gray);
            }
            
            .result-cover {
                width: 50px;
                height: 70px;
                object-fit: cover;
                border-radius: 6px;
                flex-shrink: 0;
            }
            
            .result-info {
                flex: 1;
                min-width: 0;
            }
            
            .result-title {
                font-weight: 600;
                color: var(--text-light);
                margin-bottom: 4px;
                font-size: 0.9rem;
                line-height: 1.3;
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
            
            .result-subtitle {
                color: var(--text-gray);
                font-size: 0.8rem;
                margin-bottom: 6px;
                display: flex;
                align-items: center;
                gap: 4px;
            }
            
            .result-meta {
                display: flex;
                gap: 8px;
                font-size: 0.75rem;
            }
            
            .result-meta .status-badge {
                padding: 2px 6px;
                border-radius: 4px;
                font-size: 0.7rem;
            }
            
            .highlight {
                background: rgba(30, 136, 229, 0.2);
                color: var(--primary-color);
                font-weight: 700;
                padding: 0 2px;
                border-radius: 2px;
            }
            
            /* Responsividade para mobile */
            @media (max-width: 768px) {
                .search-results-container {
                    position: fixed;
                    top: 70px;
                    left: 16px;
                    right: 16px;
                    max-height: 60vh;
                    z-index: 2000;
                }
                
                .search-result-item {
                    padding: 10px 12px;
                }
                
                .result-cover {
                    width: 40px;
                    height: 56px;
                }
                
                .result-title {
                    font-size: 0.85rem;
                }
            }
            
            @media (max-width: 480px) {
                .search-results-container {
                    left: 10px;
                    right: 10px;
                }
                
                .search-result-item {
                    padding: 8px 10px;
                    gap: 8px;
                }
                
                .result-cover {
                    width: 35px;
                    height: 49px;
                }
                
                .result-meta {
                    flex-direction: column;
                    gap: 2px;
                }
            }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', searchStyles);
});