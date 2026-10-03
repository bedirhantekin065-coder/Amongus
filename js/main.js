// ===== ANA UYGULAMA GİRİŞ NOKTASI =====

// ===== Sayfa Yükleme =====
document.addEventListener('DOMContentLoaded', () => {
    console.log('Among Us Türkçe - Oyun Yüklendi');
    
    // Offline mod butonunu ekle
    addOfflineButton();
    
    // Temel başlatma
    initializeApplication();
    
    // Offline modu başlat
    checkOfflineMode();
});

// ===== Uygulama Başlatma =====
function initializeApplication() {
    // 1. Gerekli bileşenleri başlat
    initializeCoreComponents();
    
    // 2. UI bileşenlerini başlat
    initializeUIComponents();
    
    // 3. Event listener'ları ekle
    initializeEventListeners();
    
    // 4. Kullanıcı durumu kontrol et
    checkUserState();
    
    // 5. WebSocket bağlantısını kur
    initializeWebSocket();
    
    console.log('Uygulama başlatıldı');
}

// ===== Çekirdek Bileşenler =====
function initializeCoreComponents() {
    // EventBus'u başlat (zaten global olarak tanımlandı)
    console.log('EventBus başlatıldı');
    
    // Oyun yapısını başlat
    console.log('Game instance oluşturuldu');
    
    // Animasyon yöneticisini başlat
    console.log('AnimationManager başlatıldı');
    
    // Bot AI kütüphanesini başlat
    console.log('BotAILibrary başlatıldı');
}

// ===== UI Bileşenleri =====
function initializeUIComponents() {
    // Ana menüyi hazırla
    prepareMainMenu();
    
    // Modal pencereleri hazırla
    prepareModals();
    
    // Oda lobisi arayüzünü hazırla
    prepareLobbyUI();
    
    // Oyun ekranını hazırla
    prepareGameScreen();
    
    // Admin panelini hazırla
    prepareAdminPanel();
    
    console.log('UI bileşenleri hazırlandı');
}

// ===== Event Listener'lar =====
function initializeEventListeners() {
    // Pencere boyut değişiklikleri
    window.addEventListener('resize', debounce(handleWindowResize, 250));
    
    // Klavye kısayolları
    document.addEventListener('keydown', handleGlobalKeydown);
    
    // Fare olayları
    document.addEventListener('click', handleGlobalClick);
    
    // Touch olayları (mobil destek)
    document.addEventListener('touchstart', handleTouchStart);
    
    console.log('Event listenerlar eklendi');
}

// ===== Kullanıcı Durumu Kontrolü =====
function checkUserState() {
    const username = getCookie('amongus_username');
    const color = getCookie('amongus_color');
    
    console.log('Kullanıcı durumu kontrol ediliyor:', { username, color });
    
    if (username && isValidUsername(username)) {
        // Kullanıcı adı varsa, ana menüyü göster
        showMainMenu();
        
        // Admin kontrolü
        checkAdminStatus();
        
        console.log('Kullanıcı adı bulundu, ana menü gösteriliyor');
    } else {
        // Kullanıcı adı yoksa, giriş panelini göster
        showUsernamePanel();
        console.log('Kullanıcı adı bulunamadı, giriş panelini gösteriliyor');
    }
}

// ===== WebSocket Başlatma =====
function initializeWebSocket() {
    // WebSocket URL'sini belirle
    const wsUrl = getWebSocketUrl();
    
    try {
        // WebSocket bağlantısını kur
        game.socket = new WebSocket(wsUrl);
        
        // Event handler'ları ekle
        game.socket.onopen = handleWebSocketOpen;
        game.socket.onmessage = handleWebSocketMessage;
        game.socket.onclose = handleWebSocketClose;
        game.socket.onerror = handleWebSocketError;
        
        console.log('WebSocket bağlantısı kuruldu:', wsUrl);
    } catch (error) {
        console.error('WebSocket hatası:', error);
        showNotification('WebSocket bağlantısı kurulamadı', 'error');
        
        // Yeniden dene
        setTimeout(initializeWebSocket, 5000);
    }
}

function getWebSocketUrl() {
    // Geliştirme modunda localhost kullan
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1' ||
        window.location.hostname === '') {
        return 'ws://localhost:8080';
    }
    
    // Üretim modunda WebSocket URL'sini oluştur
    return `wss://${window.location.host}`;
}

// ===== WebSocket Event Handler'ları =====
function handleWebSocketOpen(event) {
    console.log('WebSocket bağlantısı açıldı');
    EventBus.emit('socket_connected', event);
    
    // Durumu senkronize et
    game.syncGameState();
}

function handleWebSocketMessage(event) {
    try {
        const data = JSON.parse(event.data);
        console.log('WebSocket mesajı alındı:', data.type);
        
        // Mesajı işle
        handleSocketMessage(data);
    } catch (error) {
        console.error('Mesaj parse hatası:', error);
        showNotification('Mesaj işlenemedi', 'error');
    }
}

function handleWebSocketClose(event) {
    console.log('WebSocket bağlantısı kapandı:', event.code, event.reason);
    EventBus.emit('socket_disconnected', event);
    
    // Yeniden bağlanmayı dene
    setTimeout(() => {
        if (!game.socket || game.socket.readyState !== WebSocket.OPEN) {
            initializeWebSocket();
        }
    }, 5000);
}

function handleWebSocketError(error) {
    console.error('WebSocket hatası:', error);
    EventBus.emit('socket_error', error);
}

// ===== UI Hazırlama Fonksiyonları =====
function prepareMainMenu() {
    // Ana menü öğelerini hazırla
    const mainMenu = document.getElementById('mainMenu');
    const usernamePanel = document.getElementById('usernamePanel');
    
    if (mainMenu && usernamePanel) {
        // Varsayılan olarak giriş panelini göster
        mainMenu.style.display = 'none';
        usernamePanel.style.display = 'block';
    }
    
    // Buton event'larını ekle
    const createRoomBtn = document.getElementById('createRoomBtn');
    if (createRoomBtn) {
        createRoomBtn.onclick = showCreateRoom;
    }
    
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    if (joinRoomBtn) {
        joinRoomBtn.onclick = showJoinRoom;
    }
    
    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) {
        settingsBtn.onclick = showSettings;
    }
    
    const adminBtn = document.getElementById('adminBtn');
    if (adminBtn) {
        adminBtn.onclick = showAdminPanel;
        // Başlangıçta gizle
        adminBtn.style.display = 'none';
    }
}

function prepareModals() {
    // Tüm modal pencerelerini gizle
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('show');
    });
    
    // Modal kapatma butonlarını ekle
    document.querySelectorAll('.close-btn').forEach(btn => {
        btn.onclick = () => {
            const modal = btn.closest('.modal');
            if (modal) modal.classList.remove('show');
        };
    });
    
    // Oda oluşturma modalini hazırla
    prepareCreateRoomModal();
    
    // Odaya katıl modalini hazırla
    prepareJoinRoomModal();
    
    // Ayarlar modalini hazırla
    prepareSettingsModal();
}

function prepareCreateRoomModal() {
    const modal = document.getElementById('createRoomModal');
    if (!modal) return;
    
    // Varsayılan değerleri ayarla
    const maxPlayersInput = document.getElementById('maxPlayers');
    if (maxPlayersInput) maxPlayersInput.value = 10;
    
    const imposterCountInput = document.getElementById('imposterCount');
    if (imposterCountInput) imposterCountInput.value = 1;
    
    const addBotsCheckbox = document.getElementById('addBots');
    if (addBotsCheckbox) {
        addBotsCheckbox.checked = false;
        addBotsCheckbox.onchange = addBotsToRoom;
    }
    
    const botCountInput = document.getElementById('botCount');
    if (botCountInput) botCountInput.value = 2;
    
    // Oluştur butonunu ekle
    const createBtn = modal.querySelector('.btn-success');
    if (createBtn) {
        createBtn.onclick = createRoom;
    }
}

function prepareJoinRoomModal() {
    const modal = document.getElementById('joinRoomModal');
    if (!modal) return;
    
    // Oda kodu inputunu temizle
    const roomCodeInput = document.getElementById('roomCode');
    if (roomCodeInput) roomCodeInput.value = '';
    
    // Katıl butonunu ekle
    const joinBtn = modal.querySelector('.btn-primary');
    if (joinBtn) {
        joinBtn.onclick = joinRoom;
    }
    
    // Yenile butonunu ekle
    const refreshBtn = modal.querySelector('.btn-info');
    if (refreshBtn) {
        refreshBtn.onclick = refreshRoomList;
    }
}

function prepareSettingsModal() {
    const modal = document.getElementById('settingsModal');
    if (!modal) return;
    
    // Ses seviyelerini ayarla
    const musicVolume = document.getElementById('musicVolume');
    if (musicVolume) musicVolume.value = SoundConfig.volume.background * 100;
    
    const effectVolume = document.getElementById('effectVolume');
    if (effectVolume) effectVolume.value = SoundConfig.volume.effects * 100;
    
    // Tam ekran kontrolünü ekle
    const fullscreenToggle = document.getElementById('fullscreenToggle');
    if (fullscreenToggle) {
        fullscreenToggle.checked = false;
    }
    
    // Kaydet butonunu ekle
    const saveBtn = modal.querySelector('.btn-success');
    if (saveBtn) {
        saveBtn.onclick = saveSettings;
    }
}

function prepareLobbyUI() {
    const lobbyModal = document.getElementById('roomLobbyModal');
    if (!lobbyModal) return;
    
    // Kapat butonunu ekle
    const closeBtn = lobbyModal.querySelector('.close-btn');
    if (closeBtn) {
        closeBtn.onclick = leaveRoom;
    }
    
    // Oyunu başlat butonunu ekle
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) {
        startBtn.onclick = () => game.startGame();
    }
    
    // Kodu kopyala butonunu ekle
    const copyBtn = lobbyModal.querySelector('.btn-info');
    if (copyBtn) {
        copyBtn.onclick = copyRoomCode;
    }
    
    // Odayı terk et butonunu ekle
    const leaveBtn = lobbyModal.querySelector('.btn-danger');
    if (leaveBtn) {
        leaveBtn.onclick = leaveRoom;
    }
}

function prepareGameScreen() {
    const gameScreen = document.getElementById('gameScreen');
    if (!gameScreen) return;
    
    // Canvası hazırla
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        // Canvas boyutunu ayarla
        handleCanvasResize(canvas);
        
        // Canvas yöneticisini oluştur
        game.canvasManager = new CanvasAnimationManager(canvas);
    }
    
    // Acil durum butonunu ekle
    const emergencyBtn = document.querySelector('.emergency-button');
    if (emergencyBtn) {
        emergencyBtn.onclick = () => game.callMeeting();
    }
}

function prepareAdminPanel() {
    const adminPanel = document.getElementById('adminPanel');
    if (!adminPanel) return;
    
    // Sekme butonlarını hazırla
    const tabBtns = adminPanel.querySelectorAll('.tab-btn');
    tabBtns.forEach((btn, index) => {
        btn.onclick = () => showAdminTab(['rooms', 'bots', 'players', 'settings'][index]);
    });
    
    // Geri butonunu ekle
    const backBtn = adminPanel.querySelector('.btn-secondary');
    if (backBtn) {
        backBtn.onclick = () => closeModal('adminPanel');
    }
}

// ===== Kullanıcı Arayüzü Yönetimi =====
function showUsernamePanel() {
    const usernamePanel = document.getElementById('usernamePanel');
    const mainMenu = document.getElementById('mainMenu');
    
    if (usernamePanel) usernamePanel.style.display = 'block';
    if (mainMenu) mainMenu.style.display = 'none';
    
    // Input'a odaklan
    const usernameInput = document.getElementById('usernameInput');
    if (usernameInput) {
        usernameInput.focus();
        usernameInput.value = getCookie('amongus_username') || '';
    }
    
    // Renk seçimini ayarla
    const colorSelect = document.getElementById('colorSelect');
    if (colorSelect) {
        colorSelect.value = getCookie('amongus_color') || 'red';
    }
}

function showMainMenu() {
    const usernamePanel = document.getElementById('usernamePanel');
    const mainMenu = document.getElementById('mainMenu');
    
    const username = getCookie('amongus_username');
    
    if (username && isValidUsername(username)) {
        if (usernamePanel) usernamePanel.style.display = 'none';
        if (mainMenu) mainMenu.style.display = 'flex';
    } else {
        if (usernamePanel) usernamePanel.style.display = 'block';
        if (mainMenu) mainMenu.style.display = 'none';
    }
}

function checkAdminStatus() {
    // Geliştirme modunda admin yetkisi ver
    if (window.location.hostname === 'localhost' || 
        window.location.hostname === '127.0.0.1') {
        game.isAdmin = true;
        const adminBtn = document.getElementById('adminBtn');
        if (adminBtn) adminBtn.style.display = 'block';
    }
}

// ===== Olay Yöneticileri =====
function handleGlobalKeydown(event) {
    // Escape tuşu - modal'ları kapat
    if (event.key === 'Escape') {
        closeAllModals();
        return;
    }
    
    // Oyun içerisindeyse, oyun kontrolünü devret
    if (game.gameStarted && !game.gameEnded) {
        handleGameKeydown(event);
    }
}

function handleGameKeydown(event) {
    // Hareket tuşları
    if (event.key === 'ArrowUp') {
        game.movePlayer('up');
        event.preventDefault();
    } else if (event.key === 'ArrowDown') {
        game.movePlayer('down');
        event.preventDefault();
    } else if (event.key === 'ArrowLeft') {
        game.movePlayer('left');
        event.preventDefault();
    } else if (event.key === 'ArrowRight') {
        game.movePlayer('right');
        event.preventDefault();
    }
    
    // Diagonal hareketler
    if (event.key === 'w' || event.key === 'W') {
        game.movePlayer('up');
        event.preventDefault();
    } else if (event.key === 's' || event.key === 'S') {
        game.movePlayer('down');
        event.preventDefault();
    } else if (event.key === 'a' || event.key === 'A') {
        game.movePlayer('left');
        event.preventDefault();
    } else if (event.key === 'd' || event.key === 'D') {
        game.movePlayer('right');
        event.preventDefault();
    }
    
    // Eylem tuşları
    if (event.key === ' ' || event.key === 'Spacebar') {
        game.callMeeting();
        event.preventDefault();
    } else if (event.key === 'e' || event.key === 'E') {
        handleInteraction();
        event.preventDefault();
    } else if (event.key === 'q' || event.key === 'Q') {
        handleKill();
        event.preventDefault();
    }
    
    // Chat input'u
    if (event.key === 'Enter') {
        const chatInput = document.getElementById('chatInput');
        if (chatInput && document.activeElement === chatInput) {
            const message = chatInput.value.trim();
            if (message) {
                game.sendChatMessage(message);
                chatInput.value = '';
            }
            event.preventDefault();
        }
    }
}

function handleGlobalClick(event) {
    // Modal dışına tıklama - modal'ları kapat
    if (event.target.classList.contains('modal')) {
        event.target.classList.remove('show');
    }
}

function handleTouchStart(event) {
    // Touch olaylarını işle (mobil destek)
    // Bu basit bir implementasyondur, daha gelişmiş dokunmatik kontroller eklenebilir
}

function handleWindowResize() {
    // Canvas boyutunu güncelle
    const canvas = document.getElementById('gameCanvas');
    if (canvas) {
        handleCanvasResize(canvas);
    }
}

function handleCanvasResize(canvas) {
    const container = canvas.parentElement;
    if (container) {
        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;
        
        if (game.canvasManager) {
            game.canvasManager.resize(canvas.width, canvas.height);
        }
    }
}

// ===== Bildirim Sistemi =====
function showNotification(message, type = 'info', duration = 5000) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    container.appendChild(notification);
    
    // Otomatik olarak kaldır
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, duration);
}

// ===== Yükleme Durumu =====
function showLoading(text = 'Yükleniyor...') {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    
    if (overlay && loadingText) {
        loadingText.textContent = text;
        overlay.classList.add('show');
    }
}

function hideLoading() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.classList.remove('show');
    }
}

// ===== Hata Yönetimi =====
function handleError(error, context = '') {
    console.error(`Hata ${context}:`, error);
    
    let message = 'Beklenmeyen bir hata oluştu';
    
    if (typeof error === 'string') {
        message = error;
    } else if (error && error.message) {
        message = error.message;
    }
    
    showNotification(message, 'error');
}

// ===== WebSocket Mesaj İşleyici =====
function handleSocketMessage(data) {
    // Mesaj türüne göre işle
    switch (data.type) {
        case 'pong':
            // Ping-pong yanıtı
            break;
        
        case 'error':
            showNotification(data.message || 'Sunucu hatası', 'error');
            break;
        
        case 'info':
            showNotification(data.message || 'Bilgi', 'info');
            break;
        
        case 'success':
            showNotification(data.message || 'Başarılı', 'success');
            break;
        
        default:
            // Diğer mesajlar EventBus aracılığıyla işlenecek
            EventBus.emit(data.type, data);
            break;
    }
}

// ===== Sayfa Kapanma =====
window.addEventListener('beforeunload', () => {
    // WebSocket bağlantısını kapat
    if (game.socket) {
        game.socket.close();
        game.socket = null;
    }
    
    // Odayı terk et
    game.leaveRoom();
    
    console.log('Sayfa kapatılıyor, temizlik yapılıyor');
});

// ===== Uygulama Durumu =====
// Uygulamanın başlatıldığını global olarak işaretle
window.appInitialized = true;

console.log('Among Us Türkçe - Uygulama başlatma tamamlandı');
