// ===== OFFLINE DEPOLAMA SİSTEMİ =====
// SQL yerine LocalStorage/IndexedDB tabanlı offline oyun desteği

class OfflineStorage {
    constructor() {
        this.storage = window.localStorage;
        this.prefix = 'amongus_offline_';
        this.init();
    }
    
    init() {
        // Depolama alanını kontrol et
        if (!this.storage) {
            console.error('LocalStorage desteklenmiyor!');
            return false;
        }
        
        // Eski verileri temizle (gerekirse)
        this.cleanupOldData();
        
        return true;
    }
    
    // ===== Anahtar Değer İşlemleri =====
    set(key, value) {
        try {
            const storageKey = this.prefix + key;
            this.storage.setItem(storageKey, JSON.stringify(value));
            return true;
        } catch (e) {
            console.error('Depolama hatası:', e);
            return false;
        }
    }
    
    get(key, defaultValue = null) {
        try {
            const storageKey = this.prefix + key;
            const item = this.storage.getItem(storageKey);
            return item ? JSON.parse(item) : defaultValue;
        } catch (e) {
            console.error('Depolama okuma hatası:', e);
            return defaultValue;
        }
    }
    
    remove(key) {
        try {
            const storageKey = this.prefix + key;
            this.storage.removeItem(storageKey);
            return true;
        } catch (e) {
            console.error('Depolama silme hatası:', e);
            return false;
        }
    }
    
    clear() {
        try {
            // Tüm amongus verilerini sil
            for (let i = 0; i < this.storage.length; i++) {
                const key = this.storage.key(i);
                if (key && key.startsWith(this.prefix)) {
                    this.storage.removeItem(key);
                    i--; // Silinen öğe için index düzeltilir
                }
            }
            return true;
        } catch (e) {
            console.error('Depolama temizleme hatası:', e);
            return false;
        }
    }
    
    // ===== Oyun Verilerini Kaydet =====
    saveGameState(gameState) {
        const saveData = {
            timestamp: Date.now(),
            state: gameState
        };
        return this.set('game_state', saveData);
    }
    
    loadGameState() {
        const saveData = this.get('game_state', null);
        if (!saveData) return null;
        
        // 24 saatten eski kaydı sil
        if (Date.now() - saveData.timestamp > 24 * 60 * 60 * 1000) {
            this.remove('game_state');
            return null;
        }
        
        return saveData.state;
    }
    
    // ===== Oda Verilerini Kaydet =====
    saveRoom(room) {
        const roomData = {
            roomCode: room.roomCode,
            roomName: room.roomName,
            map: room.map,
            maxPlayers: room.maxPlayers,
            imposterCount: room.imposterCount,
            players: room.players,
            tasks: room.tasks,
            bodies: room.bodies,
            state: room.state,
            hostId: room.hostId,
            createdAt: room.createdAt,
            lastActivity: room.lastActivity
        };
        
        const saveKey = this.prefix + 'room_' + room.roomCode;
        return this.set('room_' + room.roomCode, roomData);
    }
    
    loadRoom(roomCode) {
        return this.get('room_' + roomCode, null);
    }
    
    getAllRooms() {
        const rooms = [];
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(this.prefix + 'room_')) {
                const room = this.get(key.replace(this.prefix, ''), null);
                if (room) rooms.push(room);
            }
        }
        return rooms;
    }
    
    deleteRoom(roomCode) {
        return this.remove('room_' + roomCode);
    }
    
    // ===== Oyuncu Verilerini Kaydet =====
    savePlayer(player) {
        const playerData = {
            id: player.id,
            name: player.name,
            color: player.color,
            role: player.role,
            isHost: player.isHost,
            isBot: player.isBot,
            isDead: player.isDead,
            x: player.x,
            y: player.y,
            joinedAt: player.joinedAt
        };
        
        return this.set('player_' + player.id, playerData);
    }
    
    loadPlayer(playerId) {
        return this.get('player_' + playerId, null);
    }
    
    // ===== Tek Kişilik Mod Verileri =====
    saveSinglePlayerGame(gameData) {
        const saveData = {
            timestamp: Date.now(),
            player: gameData.player,
            room: gameData.room,
            tasks: gameData.tasks,
            bodies: gameData.bodies,
            state: gameData.state,
            timer: gameData.timer
        };
        return this.set('single_player_game', saveData);
    }
    
    loadSinglePlayerGame() {
        const saveData = this.get('single_player_game', null);
        if (!saveData) return null;
        return saveData;
    }
    
    // ===== Eski Verileri Temizle =====
    cleanupOldData() {
        const now = Date.now();
        const twentyFourHours = 24 * 60 * 60 * 1000;
        
        for (let i = 0; i < this.storage.length; i++) {
            const key = this.storage.key(i);
            if (key && key.startsWith(this.prefix)) {
                try {
                    const item = JSON.parse(this.storage.getItem(key));
                    if (item && item.timestamp && (now - item.timestamp) > twentyFourHours) {
                        this.storage.removeItem(key);
                        i--;
                    }
                } catch (e) {
                    // JSON parse hatası olanları da sil
                    this.storage.removeItem(key);
                    i--;
                }
            }
        }
    }
    
    // ===== IndexedDB Desteği (Büyük Veriler İçin) =====
    checkIndexedDBSupport() {
        return 'indexedDB' in window;
    }
    
    async initIndexedDB() {
        if (!this.checkIndexedDBSupport()) {
            return false;
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AmongUsOfflineDB', 1);
            
            request.onerror = (event) => {
                console.error('IndexedDB açma hatası:', event);
                reject(false);
            };
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                resolve(true);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                // ObjectStore oluştur
                if (!db.objectStoreNames.contains('rooms')) {
                    db.createObjectStore('rooms', { keyPath: 'roomCode' });
                }
                if (!db.objectStoreNames.contains('players')) {
                    db.createObjectStore('players', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('games')) {
                    db.createObjectStore('games', { keyPath: 'id' });
                }
            };
        });
    }
    
    async saveToIndexedDB(storeName, data, key = null) {
        if (!this.db) {
            await this.initIndexedDB();
            if (!this.db) return false;
        }
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = key ? store.put(data, key) : store.put(data);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }
    
    async getFromIndexedDB(storeName, key) {
        if (!this.db) {
            await this.initIndexedDB();
            if (!this.db) return null;
        }
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            
            const request = store.get(key);
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => resolve(null);
        });
    }
    
    async getAllFromIndexedDB(storeName) {
        if (!this.db) {
            await this.initIndexedDB();
            if (!this.db) return [];
        }
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const results = [];
            
            const request = store.openCursor();
            
            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    results.push(cursor.value);
                    cursor.continue();
                } else {
                    resolve(results);
                }
            };
            
            request.onerror = () => resolve([]);
        });
    }
    
    async deleteFromIndexedDB(storeName, key) {
        if (!this.db) {
            await this.initIndexedDB();
            if (!this.db) return false;
        }
        
        return new Promise((resolve) => {
            const transaction = this.db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            const request = store.delete(key);
            
            request.onsuccess = () => resolve(true);
            request.onerror = () => resolve(false);
        });
    }
}

// ===== Tek Kişilik Mod =====
class SinglePlayerMode {
    constructor() {
        this.storage = new OfflineStorage();
        this.gameState = null;
        this.player = null;
        this.bots = [];
        this.tasks = [];
        this.bodies = [];
        this.timer = 0;
        this.gameStartTime = 0;
    }
    
    // Oyunu başlat
    startGame(playerName, playerColor, map = 'skeld', botCount = 2) {
        // Oyuncu oluştur
        this.player = {
            id: 'player_1',
            name: playerName,
            color: playerColor,
            role: 'crewmate',
            isHost: true,
            isBot: false,
            isDead: false,
            x: 100,
            y: 100,
            direction: 'right'
        };
        
        // Harita verilerini al
        const mapData = Config.MAPS[map];
        
        // Botları oluştur
        this.bots = this.createBots(botCount, mapData, playerColor);
        
        // Tüm oyuncuları birleştir
        const allPlayers = [this.player, ...this.bots];
        
        // Roller ata (1 imposter)
        this.assignRoles(allPlayers);
        
        // Görevleri oluştur
        this.tasks = this.createTasks(mapData);
        
        // Oda durumunu oluştur
        this.gameState = {
            roomCode: 'SINGLE_PLAYER',
            roomName: 'Tek Kişilik Mod',
            map: map,
            maxPlayers: botCount + 1,
            imposterCount: 1,
            players: allPlayers,
            tasks: this.tasks,
            bodies: this.bodies,
            state: Config.GAME_STATES.PLAYING,
            timer: 0,
            gameStartTime: Date.now()
        };
        
        this.gameStartTime = Date.now();
        
        // Kaydet
        this.storage.saveSinglePlayerGame({
            player: this.player,
            room: this.gameState,
            tasks: this.tasks,
            bodies: this.bodies,
            state: Config.GAME_STATES.PLAYING,
            timer: 0
        });
        
        return this.gameState;
    }
    
    // Botları oluştur
    createBots(count, mapData, excludeColor) {
        const colors = Object.keys(Config.COLORS).filter(c => c !== excludeColor);
        const bots = [];
        
        for (let i = 0; i < count; i++) {
            const color = colors[i % colors.length];
            const spawnPoint = mapData.spawnPoints[i % mapData.spawnPoints.length];
            
            bots.push({
                id: 'bot_' + (i + 1),
                name: 'Bot_' + (i + 1),
                color: color,
                role: null, // Roller daha sonra atanacak
                isHost: false,
                isBot: true,
                isDead: false,
                x: spawnPoint.x,
                y: spawnPoint.y,
                direction: 'right'
            });
        }
        
        return bots;
    }
    
    // Roller ata
    assignRoles(players) {
        // Tüm oyuncuları crewmate yap
        players.forEach(p => p.role = 'crewmate');
        
        // Rastgele bir oyuncu imposter yap
        const imposterIndex = Math.floor(Math.random() * players.length);
        players[imposterIndex].role = 'imposter';
        
        // Benim rolümü de ayarla
        const myPlayer = players.find(p => p.id === 'player_1');
        if (myPlayer) {
            this.player.role = myPlayer.role;
        }
    }
    
    // Görevleri oluştur
    createTasks(mapData) {
        const tasks = [];
        
        mapData.tasks.forEach(taskTemplate => {
            for (let i = 0; i < (taskTemplate.count || 1); i++) {
                tasks.push({
                    id: 'task_' + tasks.length,
                    name: taskTemplate.name,
                    completed: false,
                    completedBy: null
                });
            }
        });
        
        return tasks;
    }
    
    // Oyunu güncelle
    update(deltaTime) {
        if (!this.gameState || this.gameState.state !== Config.GAME_STATES.PLAYING) {
            return;
        }
        
        // Zamanı güncelle
        this.gameState.timer = Math.floor((Date.now() - this.gameStartTime) / 1000);
        
        // Botları güncelle
        this.updateBots(deltaTime);
        
        // Oyun sonu kontrolü
        this.checkGameEnd();
        
        // Durumu kaydet
        this.storage.saveSinglePlayerGame({
            player: this.player,
            room: this.gameState,
            tasks: this.tasks,
            bodies: this.bodies,
            state: this.gameState.state,
            timer: this.gameState.timer
        });
    }
    
    // Botları güncelle
    updateBots(deltaTime) {
        const myPlayer = this.player;
        if (!myPlayer || myPlayer.isDead) return;
        
        for (const bot of this.bots) {
            if (bot.isDead) continue;
            
            // Bot AI'sını güncelle
            this.updateBotAI(bot, deltaTime);
        }
    }
    
    // Bot AI'sını güncelle
    updateBotAI(bot, deltaTime) {
        const myPlayer = this.player;
        
        // Eğer bot imposter ise
        if (bot.role === 'imposter') {
            this.updateImposterBot(bot, deltaTime);
        } else {
            this.updateCrewmateBot(bot, deltaTime);
        }
    }
    
    // Imposter botunu güncelle
    updateImposterBot(bot, deltaTime) {
        const myPlayer = this.player;
        
        // Eğer yakınsa öldür
        if (!myPlayer.isDead && bot.role === 'imposter') {
            const distance = getDistance(bot.x, bot.y, myPlayer.x, myPlayer.y);
            if (distance < 100) {
                // Rastgele öldürme kararı
                if (Math.random() < 0.01) {
                    this.killPlayer(bot.id, myPlayer.id);
                    return;
                }
            }
        }
        
        // Rastgele hareket
        if (Math.random() < 0.005) {
            const directions = ['up', 'down', 'left', 'right'];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            this.moveBot(bot, direction, deltaTime);
        }
    }
    
    // Crewmate botunu güncelle
    updateCrewmateBot(bot, deltaTime) {
        // Görev yap
        if (Math.random() < 0.002) {
            this.doBotTask(bot);
        }
        
        // Rastgele hareket
        if (Math.random() < 0.005) {
            const directions = ['up', 'down', 'left', 'right'];
            const direction = directions[Math.floor(Math.random() * directions.length)];
            this.moveBot(bot, direction, deltaTime);
        }
    }
    
    // Botu hareket ettir
    moveBot(bot, direction, deltaTime) {
        const speed = bot.role === 'imposter' ? 220 : 200;
        const moveDistance = speed * deltaTime / 1000;
        
        switch (direction) {
            case 'up': bot.y -= moveDistance; break;
            case 'down': bot.y += moveDistance; break;
            case 'left': bot.x -= moveDistance; break;
            case 'right': bot.x += moveDistance; break;
        }
        
        bot.direction = direction;
        
        // Harita sınırlarını kontrol et
        const map = Config.MAPS[this.gameState.map];
        bot.x = Math.max(0, Math.min(map.width, bot.x));
        bot.y = Math.max(0, Math.min(map.height, bot.y));
    }
    
    // Bot görev yap
    doBotTask(bot) {
        // Rastgele bir görev seç
        const incompleteTasks = this.tasks.filter(t => !t.completed);
        if (incompleteTasks.length === 0) return;
        
        const task = incompleteTasks[Math.floor(Math.random() * incompleteTasks.length)];
        const map = Config.MAPS[this.gameState.map];
        const taskDef = map.tasks.find(t => t.name === task.name);
        
        if (!taskDef) return;
        
        const taskPosition = taskDef.positions[0];
        const distance = getDistance(bot.x, bot.y, taskPosition.x, taskPosition.y);
        
        if (distance < 50) {
            task.completed = true;
            task.completedBy = bot.id;
        }
    }
    
    // Oyuncuyu öldür
    killPlayer(killerId, playerId) {
        const killer = this.gameState.players.find(p => p.id === killerId);
        const player = this.gameState.players.find(p => p.id === playerId);
        
        if (!killer || !player) return false;
        if (killer.role !== 'imposter') return false;
        if (player.isDead) return false;
        if (player.role === 'imposter') return false;
        
        player.isDead = true;
        player.deathTime = Date.now();
        player.killedBy = killerId;
        
        // Ceset ekle
        this.bodies.push({
            id: 'body_' + Date.now() + '_' + playerId,
            playerId: playerId,
            x: player.x,
            y: player.y,
            time: Date.now()
        });
        
        // Oyun sonu kontrolü
        this.checkGameEnd();
        
        return true;
    }
    
    // Oyuncu hareketi
    movePlayer(direction) {
        if (!this.player || this.player.isDead) return;
        
        const speed = this.player.role === 'imposter' ? Config.GRAPHICS_CONFIG.IMPOSTER_SPEED : Config.GRAPHICS_CONFIG.CREWMATE_SPEED;
        const moveDistance = speed * 0.1;
        
        switch (direction) {
            case 'up': this.player.y -= moveDistance; break;
            case 'down': this.player.y += moveDistance; break;
            case 'left': this.player.x -= moveDistance; break;
            case 'right': this.player.x += moveDistance; break;
            case 'up-left': this.player.x -= moveDistance * 0.7; this.player.y -= moveDistance * 0.7; break;
            case 'up-right': this.player.x += moveDistance * 0.7; this.player.y -= moveDistance * 0.7; break;
            case 'down-left': this.player.x -= moveDistance * 0.7; this.player.y += moveDistance * 0.7; break;
            case 'down-right': this.player.x += moveDistance * 0.7; this.player.y += moveDistance * 0.7; break;
        }
        
        this.player.direction = direction;
        
        // Harita sınırlarını kontrol et
        const map = Config.MAPS[this.gameState.map];
        this.player.x = Math.max(0, Math.min(map.width, this.player.x));
        this.player.y = Math.max(0, Math.min(map.height, this.player.y));
    }
    
    // Görev yap
    doTask(taskId) {
        if (!this.player || this.player.isDead || this.player.role !== 'crewmate') return false;
        
        const task = this.tasks.find(t => t.id === taskId && !t.completed);
        if (!task) return false;
        
        const map = Config.MAPS[this.gameState.map];
        const taskDef = map.tasks.find(t => t.name === task.name);
        if (!taskDef) return false;
        
        const taskPosition = taskDef.positions[0];
        const distance = getDistance(this.player.x, this.player.y, taskPosition.x, taskPosition.y);
        
        if (distance > 50) {
            showNotification('Görev yapmak için yaklaşmalısınız', 'warning');
            return false;
        }
        
        task.completed = true;
        task.completedBy = this.player.id;
        
        showNotification('Görev tamamlandı!', 'success');
        
        // Oyun sonu kontrolü
        this.checkGameEnd();
        
        return true;
    }
    
    // Oyun sonu kontrolü
    checkGameEnd() {
        const crewmates = this.gameState.players.filter(p => !p.isDead && p.role === 'crewmate');
        const imposters = this.gameState.players.filter(p => !p.isDead && p.role === 'imposter');
        
        const allTasksCompleted = this.tasks.every(t => t.completed);
        
        if (allTasksCompleted && imposters.length === 0) {
            this.gameState.state = Config.GAME_STATES.ENDED;
            this.gameState.winner = 'crewmate';
            showNotification('Crewmate kazandi!', 'success');
        } else if (crewmates.length <= imposters.length) {
            this.gameState.state = Config.GAME_STATES.ENDED;
            this.gameState.winner = 'imposter';
            showNotification('Imposter kazandi!', 'danger');
        }
    }
    
    // Oyunu kaydet
    saveGame() {
        return this.storage.saveSinglePlayerGame({
            player: this.player,
            room: this.gameState,
            tasks: this.tasks,
            bodies: this.bodies,
            state: this.gameState.state,
            timer: this.gameState.timer
        });
    }
    
    // Oyunu yükle
    loadGame() {
        const savedGame = this.storage.loadSinglePlayerGame();
        if (!savedGame) return null;
        
        this.player = savedGame.player;
        this.gameState = savedGame.room;
        this.tasks = savedGame.tasks;
        this.bodies = savedGame.bodies;
        this.gameStartTime = Date.now() - (savedGame.timer * 1000);
        
        return this.gameState;
    }
    
    // Oyunu sıfırla
    resetGame() {
        this.player = null;
        this.bots = [];
        this.tasks = [];
        this.bodies = [];
        this.gameState = null;
        this.timer = 0;
        this.gameStartTime = 0;
        
        this.storage.remove('single_player_game');
    }
    
    // Oyuncu bilgisini al
    getPlayer() {
        return this.player;
    }
    
    // Oyun durumunu al
    getGameState() {
        return this.gameState;
    }
    
    // Görevleri al
    getTasks() {
        return this.tasks;
    }
    
    // Cesetleri al
    getBodies() {
        return this.bodies;
    }
}

// ===== Offline Oyun Yöneticisi =====
class OfflineGameManager {
    constructor() {
        this.storage = new OfflineStorage();
        this.singlePlayerMode = new SinglePlayerMode();
        this.currentMode = null; // 'single' or 'multi'
    }
    
    // Tek kişilik modu başlat
    startSinglePlayer(playerName, playerColor, map = 'skeld', botCount = 2) {
        this.currentMode = 'single';
        return this.singlePlayerMode.startGame(playerName, playerColor, map, botCount);
    }
    
    // Çok oyunculu modu başlat (offline simülasyon)
    startMultiplayerOffline(roomData, playerData) {
        this.currentMode = 'multi';
        // Bu modda veriler localStorage'de saklanır
        return this.storage.saveRoom(roomData);
    }
    
    // Oyunu güncelle
    update(deltaTime) {
        if (this.currentMode === 'single') {
            this.singlePlayerMode.update(deltaTime);
        }
    }
    
    // Hareketi işle
    handleMove(direction) {
        if (this.currentMode === 'single') {
            this.singlePlayerMode.movePlayer(direction);
        }
    }
    
    // Görevi işle
    handleTask(taskId) {
        if (this.currentMode === 'single') {
            return this.singlePlayerMode.doTask(taskId);
        }
        return false;
    }
    
    // Öldürmeyi işle
    handleKill(killerId, playerId) {
        if (this.currentMode === 'single') {
            return this.singlePlayerMode.killPlayer(killerId, playerId);
        }
        return false;
    }
    
    // Oyunu kaydet
    saveGame() {
        if (this.currentMode === 'single') {
            return this.singlePlayerMode.saveGame();
        }
        return false;
    }
    
    // Oyunu yükle
    loadGame() {
        if (this.currentMode === 'single') {
            return this.singlePlayerMode.loadGame();
        }
        return null;
    }
    
    // Oyunu sıfırla
    resetGame() {
        if (this.currentMode === 'single') {
            this.singlePlayerMode.resetGame();
        }
        this.currentMode = null;
    }
}

// ===== Global Instance =====
const offlineStorage = new OfflineStorage();
const offlineGameManager = new OfflineGameManager();

// ===== Offline Modu Başlat =====
function startOfflineMode() {
    const username = getCookie('amongus_username') || 'Oyuncu';
    const color = getCookie('amongus_color') || 'red';
    
    // Tek kişilik modu başlat
    const gameState = offlineGameManager.startSinglePlayer(username, color, 'skeld', 2);
    
    if (gameState) {
        // Oyun durumunu ayarla
        game.state = gameState;
        game.myPlayerId = gameState.players[0].id;
        game.hostId = gameState.players[0].id;
        game.gameStarted = true;
        game.gameEnded = false;
        
        // UI'yı güncelle
        startGameScreen();
        updateGameUI();
        
        showNotification('Tek kişilik mod başladı!', 'success');
    }
}

// ===== Offline Modu Yükle =====
function loadOfflineGame() {
    const savedGame = offlineGameManager.loadGame();
    
    if (savedGame) {
        game.state = savedGame.room;
        game.myPlayerId = savedGame.player.id;
        game.hostId = savedGame.player.id;
        game.gameStarted = true;
        game.gameEnded = false;
        
        startGameScreen();
        updateGameUI();
        
        showNotification('Kaydedilen oyun yüklendi!', 'success');
    } else {
        showNotification('Kaydedilmiş oyun bulunamadı', 'warning');
    }
}

// ===== Offline Modu UI =====
function showOfflineMenu() {
    closeAllModals();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'offlineMenu';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>🎮 OFFLINE MOD</h2>
                <span class="close-btn" onclick="closeModal('offlineMenu')">&times;</span>
            </div>
            <div class="modal-body">
                <p style="text-align: center; color: var(--text-dim); margin-bottom: 20px;">
                    İnternet bağlantısı olmadan oynayabilirsiniz
                </p>
                
                <div style="display: flex; flex-direction: column; gap: 15px;">
                    <button onclick="startOfflineMode()" class="btn btn-success">
                        YENİ OYUN BAŞLAT
                    </button>
                    
                    <button onclick="loadOfflineGame()" class="btn btn-info">
                        KAYDEDİLEN OYUNU YÜKLE
                    </button>
                    
                    <button onclick="showOfflineSettings()" class="btn btn-secondary">
                        AYARLAR
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('show');
}

function showOfflineSettings() {
    closeAllModals();
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.id = 'offlineSettings';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>⚙️ OFFLINE AYARLAR</h2>
                <span class="close-btn" onclick="closeModal('offlineSettings')">&times;</span>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label>Harita Seçin</label>
                    <select id="offlineMapSelect">
                        <option value="skeld">The Skeld</option>
                        <option value="mira">Mira HQ</option>
                        <option value="polus">Polus</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Bot Sayısı (0-8)</label>
                    <input type="number" id="offlineBotCount" min="0" max="8" value="2">
                </select>
                </div>
                
                <div style="display: flex; justify-content: space-between; margin-top: 20px;">
                    <button onclick="startOfflineGameWithSettings()" class="btn btn-success">
                        BAŞLAT
                    </button>
                    <button onclick="closeModal('offlineSettings')" class="btn btn-secondary">
                        İPTAL
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.classList.add('show');
}

function startOfflineGameWithSettings() {
    const map = document.getElementById('offlineMapSelect').value;
    const botCount = parseInt(document.getElementById('offlineBotCount').value);
    
    const username = getCookie('amongus_username') || 'Oyuncu';
    const color = getCookie('amongus_color') || 'red';
    
    offlineGameManager.startSinglePlayer(username, color, map, botCount);
    
    closeModal('offlineSettings');
    closeModal('offlineMenu');
    
    startGameScreen();
    updateGameUI();
    
    showNotification('Offline oyun başladı!', 'success');
}

// ===== Offline Modu Kontrolü =====
function checkOfflineMode() {
    // Eğer WebSocket bağlantısı başarısız olursa offline modu öner
    if (!navigator.onLine) {
        showNotification('İnternet bağlantınız yok. Offline modu deneyin!', 'warning');
    }
}

// ===== Offline Modu İçin Klavye Kontrolleri =====
function initOfflineKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (offlineGameManager.currentMode === 'single') {
            if (e.key === 'ArrowUp') {
                offlineGameManager.handleMove('up');
                e.preventDefault();
            } else if (e.key === 'ArrowDown') {
                offlineGameManager.handleMove('down');
                e.preventDefault();
            } else if (e.key === 'ArrowLeft') {
                offlineGameManager.handleMove('left');
                e.preventDefault();
            } else if (e.key === 'ArrowRight') {
                offlineGameManager.handleMove('right');
                e.preventDefault();
            } else if (e.key === 'e' || e.key === 'E') {
                // Yakındaki görevleri tamamla
                const myPlayer = offlineGameManager.getPlayer();
                if (myPlayer && myPlayer.role === 'crewmate') {
                    const map = Config.MAPS[offlineGameManager.getGameState().map];
                    for (const task of offlineGameManager.getTasks()) {
                        if (task.completed) continue;
                        const taskDef = map.tasks.find(t => t.name === task.name);
                        if (!taskDef) continue;
                        const taskPosition = taskDef.positions[0];
                        const distance = getDistance(
                            myPlayer.x, myPlayer.y,
                            taskPosition.x, taskPosition.y
                        );
                        if (distance < 50) {
                            offlineGameManager.handleTask(task.id);
                            break;
                        }
                    }
                }
                e.preventDefault();
            }
        }
    });
}

// ===== Offline Modu Başlangıç =====
document.addEventListener('DOMContentLoaded', () => {
    // Offline modu için klavye kontrollerini başlat
    initOfflineKeyboardControls();
    
    // Çevrimdışı durumu kontrol et
    window.addEventListener('offline', checkOfflineMode);
    window.addEventListener('online', () => {
        showNotification('İnternet bağlantısı geri geldi!', 'success');
    });
});
