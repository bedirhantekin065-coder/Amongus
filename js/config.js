// ===== OYUN AYARLARI =====
const Config = {
    // Sunucu ayarları
    SERVER_URL: window.location.origin,
    WEBSOCKET_URL: window.location.hostname === 'localhost' ? 'ws://localhost:8080' : 'wss://' + window.location.host,
    
    // Oda ayarları
    MAX_PLAYERS: 10,
    MIN_PLAYERS: 1,
    MAX_BOTS: 8,
    MAX_ROOMS: 100,
    ROOM_CODE_LENGTH: 6,
    
    // Oyun ayarları
    TASK_COUNT: 5,
    MEETING_DURATION: 120, // saniye
    DISCUSSION_DURATION: 60,
    VOTING_DURATION: 60,
    KILL_COOLDOWN: 30, // saniye
    REPORT_COOLDOWN: 10,
    EMERGENCY_COOLDOWN: 30,
    
    // Haritalar
    MAPS: {
        skeld: {
            name: 'The Skeld',
            width: 2000,
            height: 1500,
            background: '#1a1a2e',
            tasks: [
                { name: 'Kart Oku', duration: 10, positions: [{x: 200, y: 300}, {x: 500, y: 200}] },
                { name: 'Kabloları Onar', duration: 15, positions: [{x: 800, y: 400}, {x: 1200, y: 300}] },
                { name: 'Yakıt Doldur', duration: 20, positions: [{x: 1500, y: 500}] },
                { name: 'Girişimci Durdur', duration: 5, positions: [{x: 300, y: 800}, {x: 700, y: 700}] },
                { name: 'Verileri İndir', duration: 25, positions: [{x: 1000, y: 800}] },
                { name: 'Kart Oku', duration: 10, positions: [{x: 1500, y: 1000}] },
                { name: 'Kabloları Onar', duration: 15, positions: [{x: 1800, y: 800}] }
            ],
            spawnPoints: [
                {x: 200, y: 200},
                {x: 500, y: 200},
                {x: 800, y: 200},
                {x: 1200, y: 200},
                {x: 1500, y: 200},
                {x: 200, y: 500},
                {x: 500, y: 500},
                {x: 800, y: 500},
                {x: 1200, y: 500},
                {x: 1500, y: 500}
            ],
            meetingPoint: {x: 900, y: 700}
        },
        mira: {
            name: 'Mira HQ',
            width: 1800,
            height: 1200,
            background: '#16213e',
            tasks: [
                { name: 'Kart Oku', duration: 10, positions: [{x: 200, y: 200}, {x: 400, y: 300}] },
                { name: 'Kabloları Onar', duration: 15, positions: [{x: 600, y: 200}, {x: 800, y: 400}] },
                { name: 'Yakıt Doldur', duration: 20, positions: [{x: 1000, y: 300}] },
                { name: 'Girişimci Durdur', duration: 5, positions: [{x: 300, y: 600}, {x: 600, y: 600}] },
                { name: 'Verileri İndir', duration: 25, positions: [{x: 900, y: 600}] },
                { name: 'Kart Oku', duration: 10, positions: [{x: 1200, y: 500}] }
            ],
            spawnPoints: [
                {x: 200, y: 200},
                {x: 400, y: 200},
                {x: 600, y: 200},
                {x: 800, y: 200},
                {x: 1000, y: 200},
                {x: 200, y: 500},
                {x: 400, y: 500},
                {x: 600, y: 500},
                {x: 800, y: 500},
                {x: 1000, y: 500}
            ],
            meetingPoint: {x: 700, y: 500}
        },
        polus: {
            name: 'Polus',
            width: 2200,
            height: 1600,
            background: '#0f3460',
            tasks: [
                { name: 'Kart Oku', duration: 10, positions: [{x: 200, y: 300}, {x: 500, y: 200}] },
                { name: 'Kabloları Onar', duration: 15, positions: [{x: 800, y: 400}, {x: 1200, y: 300}] },
                { name: 'Yakıt Doldur', duration: 20, positions: [{x: 1500, y: 500}, {x: 1800, y: 600}] },
                { name: 'Girişimci Durdur', duration: 5, positions: [{x: 300, y: 800}, {x: 700, y: 700}] },
                { name: 'Verileri İndir', duration: 25, positions: [{x: 1000, y: 800}, {x: 1400, y: 900}] },
                { name: 'Kart Oku', duration: 10, positions: [{x: 1800, y: 1000}] },
                { name: 'Kabloları Onar', duration: 15, positions: [{x: 200, y: 1200}] }
            ],
            spawnPoints: [
                {x: 200, y: 300},
                {x: 500, y: 300},
                {x: 800, y: 300},
                {x: 1200, y: 300},
                {x: 1500, y: 300},
                {x: 200, y: 700},
                {x: 500, y: 700},
                {x: 800, y: 700},
                {x: 1200, y: 700},
                {x: 1500, y: 700}
            ],
            meetingPoint: {x: 1000, y: 700}
        }
    },
    
    // Renkler
    COLORS: {
        red: { name: 'Kırmızı', hex: '#e62929', css: 'color-red' },
        blue: { name: 'Mavi', hex: '#1a5fb4', css: 'color-blue' },
        green: { name: 'Yeşil', hex: '#1cb91c', css: 'color-green' },
        yellow: { name: 'Sarı', hex: '#f9c107', css: 'color-yellow' },
        orange: { name: 'Turuncu', hex: '#fd7c15', css: 'color-orange' },
        purple: { name: 'Mor', hex: '#9d4edd', css: 'color-purple' },
        pink: { name: 'Pembe', hex: '#e677b7', css: 'color-pink' },
        cyan: { name: 'Açık Mavi', hex: '#17a2b8', css: 'color-cyan' },
        brown: { name: 'Kahverengi', hex: '#8b4513', css: 'color-brown' },
        lime: { name: 'Açık Yeşil', hex: '#7ed321', css: 'color-lime' }
    },
    
    // Oyuncu rolleri
    ROLES: {
        CREWMATE: 'crewmate',
        IMPOSTER: 'imposter'
    },
    
    // Oyun durumları
    GAME_STATES: {
        WAITING: 'waiting',
        STARTING: 'starting',
        PLAYING: 'playing',
        MEETING: 'meeting',
        VOTING: 'voting',
        ENDED: 'ended'
    },
    
    // Bot zorluk seviyeleri
    BOT_DIFFICULTY: {
        EASY: 'easy',
        NORMAL: 'normal',
        HARD: 'hard'
    },
    
    // Bot davranışları
    BOT_BEHAVIORS: {
        CREWMATE: {
            doTasks: true,
            reportBodies: true,
            callMeetings: true,
            voteInnocent: 0.7
        },
        IMPOSTER: {
            doTasks: false,
            reportBodies: false,
            callMeetings: true,
            voteInnocent: 0.3,
            killCooldown: 30,
            ventCooldown: 15
        }
    }
};

// ===== ÇEVİRİLER =====
const Translations = {
    tr: {
        // Genel
        welcome: 'Among Us Türkçe Sürümüne Hoş Geldiniz',
        loading: 'Yükleniyor...',
        error: 'Hata',
        success: 'Başarılı',
        warning: 'Uyarı',
        info: 'Bilgi',
        
        // Kullanıcı
        usernameRequired: 'Lütfen kullanıcı adınızı girin',
        usernameTooLong: 'Kullanıcı adı çok uzun (max 15 karakter)',
        usernameSaved: 'Kullanıcı adı kaydedildi!',
        
        // Oda
        roomCreated: 'Oda oluşturuldu!',
        roomJoined: 'Odaya katıldınız!',
        roomLeft: 'Odayı terk ettiniz',
        roomNotFound: 'Oda bulunamadı',
        roomFull: 'Oda dolu',
        roomStarted: 'Oyun başladı!',
        
        // Oyun
        gameStarting: 'Oyun başlıyor...',
        meetingCalled: 'toplantı çağrıldı!',
        bodyReported: 'Ceset bildirildi!',
        voted: 'Oyladınız',
        skippedVote: 'Oy kullanmadınız',
        
        // Görevler
        taskCompleted: 'Görev tamamlandı!',
        allTasksCompleted: 'Tüm görevler tamamlandı!',
        
        // Bot
        botAdded: 'Bot eklendi',
        botRemoved: 'Bot kaldırıldı',
        
        // Admin
        adminRequired: 'Admin yetkisi gerekiyor',
        settingsSaved: 'Ayarlar kaydedildi'
    }
};

// ===== SES AYARLARI =====
const SoundConfig = {
    enabled: true,
    volume: {
        background: 0.5,
        effects: 0.7,
        meeting: 0.8,
        task: 0.6,
        kill: 0.8
    }
};

// ===== GRAFİK AYARLARI =====
const GraphicsConfig = {
    // Karakter boyutları
    CREWMATE_WIDTH: 40,
    CREWMATE_HEIGHT: 60,
    
    // Hareket hızı
    CREWMATE_SPEED: 200,
    IMPOSTER_SPEED: 220,
    
    // Animasyon
    ANIMATION_SPEED: 0.1,
    
    // Kamera
    CAMERA_FOLLOW_SPEED: 0.1
};
