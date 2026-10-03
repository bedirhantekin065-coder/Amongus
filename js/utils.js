// ===== YARDIMCI FONKSİYONLAR =====

// ===== Rastgele Değer Üreticileri =====
function generateRandomId(length = 8) {
    return 'id_' + Math.random().toString(36).substr(2, length);
}

function generateRoomCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < Config.ROOM_CODE_LENGTH; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function generateUsername() {
    const adjectives = ['Kırmızı', 'Mavi', 'Yeşil', 'Sarı', 'Turuncu', 'Mor', 'Pembe', 'Akıllı', 'Hızlı', 'Güçlü', 'Zeki', 'Cesur', 'Kurnaz', 'Dikkatli', 'Neşeli'];
    const nouns = ['Crewmate', 'Imposter', 'Oyuncu', 'Kaptan', 'Mühendis', 'Bilimci', 'Asker', 'Kahraman', 'Avcı', 'Lider'];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    return adj + noun + Math.floor(Math.random() * 100);
}

// ===== Dize İşlemleri =====
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function truncateString(str, maxLength) {
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength) + '...';
}

// ===== Zaman İşlemleri =====
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getCurrentTimestamp() {
    return Date.now();
}

function timeSince(timestamp) {
    return (Date.now() - timestamp) / 1000;
}

// ===== Dizi İşlemleri =====
function shuffleArray(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

function getRandomElement(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function getRandomElements(array, count) {
    const shuffled = shuffleArray(array);
    return shuffled.slice(0, count);
}

// ===== Nesne İşlemleri =====
function deepCopy(obj) {
    return JSON.parse(JSON.stringify(obj));
}

function mergeObjects(target, source) {
    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            Object.assign(source[key], mergeObjects(target[key], source[key]));
        }
    }
    return { ...target, ...source };
}

// ===== Çerez İşlemleri =====
function setCookie(name, value, days = 365) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)};${expires};path=/`;
}

function getCookie(name) {
    const cookieName = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(cookieName) === 0) {
            return cookie.substring(cookieName.length, cookie.length);
        }
    }
    return null;
}

function deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/`;
}

function clearAllCookies() {
    const cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie;
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/";
    }
}

// ===== Depolama İşlemleri =====
function saveToLocalStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (e) {
        console.error('LocalStorage hatası:', e);
        return false;
    }
}

function getFromLocalStorage(key, defaultValue = null) {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
        console.error('LocalStorage hatası:', e);
        return defaultValue;
    }
}

function removeFromLocalStorage(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch (e) {
        console.error('LocalStorage hatası:', e);
        return false;
    }
}

// ===== URL İşlemleri =====
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function setQueryParam(name, value) {
    const url = new URL(window.location);
    url.searchParams.set(name, value);
    window.history.pushState({}, '', url);
}

function copyToClipboard(text) {
    return new Promise((resolve, reject) => {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text)
                .then(() => resolve(true))
                .catch(err => reject(err));
        } else {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                const success = document.execCommand('copy');
                document.body.removeChild(textarea);
                resolve(success);
            } catch (err) {
                document.body.removeChild(textarea);
                reject(err);
            }
        }
    });
}

// ===== Doğrulama İşlemleri =====
function isValidUsername(username) {
    if (!username || username.trim().length === 0) return false;
    if (username.length > 15) return false;
    if (username.length < 3) return false;
    // Sadece harf, rakam ve bazı özel karakterlere izin ver
    const regex = /^[a-zA-Z0-9ğĞüÜşŞıİöÖçÇ_\- ]+$/;
    return regex.test(username);
}

function isValidRoomCode(code) {
    if (!code) return false;
    const regex = /^[A-Z0-9]{6}$/;
    return regex.test(code.toUpperCase());
}

// ===== Mesafeler ve Konum =====
function getDistance(x1, y1, x2, y2) {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

function getAngle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
}

function normalizeAngle(angle) {
    while (angle < 0) angle += Math.PI * 2;
    while (angle >= Math.PI * 2) angle -= Math.PI * 2;
    return angle;
}

function getDirection(x1, y1, x2, y2) {
    const angle = getAngle(x1, y1, x2, y2);
    const directions = ['right', 'down-right', 'down', 'down-left', 'left', 'up-left', 'up', 'up-right'];
    const index = Math.round(angle / (Math.PI * 2) * 8);
    return directions[(index + 8) % 8];
}

// ===== Renk İşlemleri =====
function hexToRgb(hex) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
}

function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}

function lightenColor(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const newR = Math.min(255, Math.round(r + (255 - r) * percent / 100));
    const newG = Math.min(255, Math.round(g + (255 - g) * percent / 100));
    const newB = Math.min(255, Math.round(b + (255 - b) * percent / 100));
    return rgbToHex(newR, newG, newB);
}

function darkenColor(hex, percent) {
    const { r, g, b } = hexToRgb(hex);
    const newR = Math.round(r * (100 - percent) / 100);
    const newG = Math.round(g * (100 - percent) / 100);
    const newB = Math.round(b * (100 - percent) / 100);
    return rgbToHex(newR, newG, newB);
}

// ===== Rastgele Renk Seçimi =====
function getRandomColor(exclude = []) {
    const colors = Object.keys(Config.COLORS).filter(c => !exclude.includes(c));
    return getRandomElement(colors);
}

// ===== Mesaj Formatlama =====
function formatMessage(template, replacements = {}) {
    return template.replace(/\{(\w+)\}/g, (match, key) => replacements[key] || match);
}

// ===== Olasılık Hesaplama =====
function randomProbability(probability) {
    return Math.random() < probability;
}

// ===== Bekleme Fonksiyonu =====
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ===== Debounce Fonksiyonu =====
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ===== Throttle Fonksiyonu =====
function throttle(func, limit) {
    let inThrottle = false;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// ===== Event Emitter Sınıfı =====
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, listener) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(listener);
        return this;
    }
    
    once(event, listener) {
        const onceWrapper = (...args) => {
            listener(...args);
            this.off(event, onceWrapper);
        };
        this.on(event, onceWrapper);
        return this;
    }
    
    emit(event, ...args) {
        if (this.events[event]) {
            this.events[event].forEach(listener => listener(...args));
        }
        return this;
    }
    
    off(event, listener) {
        if (this.events[event]) {
            this.events[event] = this.events[event].filter(l => l !== listener);
        }
        return this;
    }
    
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
        return this;
    }
}

// ===== Singleton Event Bus =====
const EventBus = new EventEmitter();

// ===== UUID Üretici =====
function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// ===== Hash Fonksiyonu =====
function simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
}
