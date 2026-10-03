// ===== BOT AI SİSTEMİ =====

class BotAI {
    constructor(botId, gameState, difficulty = Config.BOT_DIFFICULTY.NORMAL) {
        this.botId = botId;
        this.gameState = gameState;
        this.difficulty = difficulty;
        this.behavior = this.getBehaviorForRole();
        this.target = null;
        this.taskIndex = 0;
        this.lastActionTime = 0;
        this.cooldowns = {
            move: 0,
            task: 0,
            kill: 0,
            vent: 0,
            report: 0,
            meeting: 0,
            vote: 0
        };
        this.memory = {
            lastSeenPlayers: {},
            suspiciousPlayers: [],
            deadPlayers: [],
            completedTasks: [],
            reportedBodies: []
        };
        this.personality = this.generatePersonality();
    }
    
    getBehaviorForRole() {
        const role = this.getMyRole();
        return role === Config.ROLES.IMPOSTER 
            ? Config.BOT_BEHAVIORS.IMPOSTER 
            : Config.BOT_BEHAVIORS.CREWMATE;
    }
    
    getMyRole() {
        const bot = this.gameState.players.find(p => p.id === this.botId);
        return bot ? bot.role : Config.ROLES.CREWMATE;
    }
    
    getMyPlayer() {
        return this.gameState.players.find(p => p.id === this.botId);
    }
    
    generatePersonality() {
        const personalities = {
            aggressive: { name: 'Saldırgan', killProbability: 0.8, taskProbability: 0.2 },
            cautious: { name: 'Dikkatli', killProbability: 0.4, taskProbability: 0.8 },
            balanced: { name: 'Dengeli', killProbability: 0.6, taskProbability: 0.6 },
            lazy: { name: 'Tembel', killProbability: 0.3, taskProbability: 0.3 },
            smart: { name: 'Zeki', killProbability: 0.5, taskProbability: 0.9 }
        };
        
        const keys = Object.keys(personalities);
        const randomKey = keys[Math.floor(Math.random() * keys.length)];
        return personalities[randomKey];
    }
    
    update(gameState, deltaTime) {
        this.gameState = gameState;
        this.updateCooldowns(deltaTime);
        this.updateMemory();
        
        // Eylem seç
        const action = this.decideAction();
        if (action) {
            this.executeAction(action);
        }
    }
    
    updateCooldowns(deltaTime) {
        for (const key in this.cooldowns) {
            this.cooldowns[key] = Math.max(0, this.cooldowns[key] - deltaTime);
        }
    }
    
    updateMemory() {
        // Ölü oyuncuları güncelle
        this.memory.deadPlayers = this.gameState.players
            .filter(p => p.isDead)
            .map(p => p.id);
        
        // Görevleri güncelle
        if (this.getMyRole() === Config.ROLES.CREWMATE) {
            this.memory.completedTasks = this.gameState.tasks
                .filter(t => t.completedBy === this.botId)
                .map(t => t.id);
        }
    }
    
    decideAction() {
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead) return null;
        
        // Öncelikli eylemler
        if (this.gameState.state === Config.GAME_STATES.MEETING) {
            return this.decideMeetingAction();
        }
        
        if (this.gameState.state === Config.GAME_STATES.VOTING) {
            return this.decideVotingAction();
        }
        
        // Normal oyun durumu
        if (this.gameState.state === Config.GAME_STATES.PLAYING) {
            return this.decideGameAction();
        }
        
        return null;
    }
    
    decideMeetingAction() {
        // Toplantıda konuşma
        if (this.cooldowns.meeting <= 0) {
            const shouldSpeak = Math.random() < 0.3;
            if (shouldSpeak) {
                this.cooldowns.meeting = 2 + Math.random() * 3;
                return { type: 'speak', message: this.generateMeetingMessage() };
            }
        }
        return null;
    }
    
    decideVotingAction() {
        if (this.cooldowns.vote <= 0) {
            this.cooldowns.vote = 5;
            const voteTarget = this.decideVoteTarget();
            return { type: 'vote', target: voteTarget };
        }
        return null;
    }
    
    decideGameAction() {
        const myPlayer = this.getMyPlayer();
        const role = this.getMyRole();
        
        // Imposter için öldürme
        if (role === Config.ROLES.IMPOSTER && this.behavior.killCooldown <= 0) {
            const killTarget = this.findKillTarget();
            if (killTarget && this.canKill(killTarget)) {
                return { type: 'kill', target: killTarget };
            }
        }
        
        // Havalandırma kullanma
        if (role === Config.ROLES.IMPOSTER && this.behavior.ventCooldown <= 0) {
            const vent = this.findNearestVent();
            if (vent && this.canVent(vent)) {
                return { type: 'vent', vent: vent };
            }
        }
        
        // Görev yapma (sadece crewmate)
        if (role === Config.ROLES.CREWMATE && this.behavior.doTasks) {
            const task = this.findNearestTask();
            if (task && this.canDoTask(task)) {
                return { type: 'task', task: task };
            }
        }
        
        // Ceset bildirme
        if (this.behavior.reportBodies) {
            const body = this.findNearestBody();
            if (body && this.canReport(body)) {
                return { type: 'report', body: body };
            }
        }
        
        // Acil durum toplantısı çağırma
        if (this.behavior.callMeetings && this.cooldowns.meeting <= 0) {
            const shouldCall = Math.random() < 0.05;
            if (shouldCall) {
                this.cooldowns.meeting = 30;
                return { type: 'emergency' };
            }
        }
        
        // Rastgele hareket
        if (this.cooldowns.move <= 0) {
            this.cooldowns.move = 0.5 + Math.random() * 1;
            const targetPosition = this.findRandomPosition();
            return { type: 'move', position: targetPosition };
        }
        
        return null;
    }
    
    findKillTarget() {
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return null;
        
        const alivePlayers = this.gameState.players.filter(p => 
            !p.isDead && 
            p.id !== this.botId && 
            p.role === Config.ROLES.CREWMATE
        );
        
        if (alivePlayers.length === 0) return null;
        
        // Yakındaki oyuncuları tercih et
        const nearbyPlayers = alivePlayers.filter(p => {
            const distance = getDistance(
                myPlayer.x, myPlayer.y,
                p.x, p.y
            );
            return distance < 200; // Yakın mesafe
        });
        
        if (nearbyPlayers.length > 0) {
            // En yakını seç
            return nearbyPlayers.reduce((closest, player) => {
                const distClosest = getDistance(myPlayer.x, myPlayer.y, closest.x, closest.y);
                const distPlayer = getDistance(myPlayer.x, myPlayer.y, player.x, player.y);
                return distPlayer < distClosest ? player : closest;
            }, nearbyPlayers[0]);
        }
        
        // Rastgele bir oyuncu seç
        return getRandomElement(alivePlayers);
    }
    
    canKill(target) {
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || !target) return false;
        
        // Mesafe kontrolü
        const distance = getDistance(myPlayer.x, myPlayer.y, target.x, target.y);
        if (distance > 100) return false; // Öldürme mesafesi
        
        // Cooldown kontrolü
        if (this.cooldowns.kill > 0) return false;
        
        // Aynı odada olma kontrolü
        if (myPlayer.room !== target.room) return false;
        
        return true;
    }
    
    findNearestVent() {
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return null;
        
        const map = Config.MAPS[this.gameState.map];
        if (!map.vents) return null;
        
        let nearestVent = null;
        let minDistance = Infinity;
        
        for (const vent of map.vents) {
            const distance = getDistance(myPlayer.x, myPlayer.y, vent.x, vent.y);
            if (distance < minDistance && distance < 150) {
                minDistance = distance;
                nearestVent = vent;
            }
        }
        
        return nearestVent;
    }
    
    canVent(vent) {
        if (!vent) return false;
        if (this.cooldowns.vent > 0) return false;
        if (this.getMyRole() !== Config.ROLES.IMPOSTER) return false;
        
        const myPlayer = this.getMyPlayer();
        const distance = getDistance(myPlayer.x, myPlayer.y, vent.x, vent.y);
        return distance < 50;
    }
    
    findNearestTask() {
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return null;
        
        const map = Config.MAPS[this.gameState.map];
        const availableTasks = this.gameState.tasks.filter(t => 
            !t.completed && 
            !this.memory.completedTasks.includes(t.id)
        );
        
        if (availableTasks.length === 0) return null;
        
        let nearestTask = null;
        let minDistance = Infinity;
        
        for (const task of availableTasks) {
            // Görevin konumunu bul
            const taskPosition = map.tasks.find(t => t.name === task.name)?.positions[0];
            if (!taskPosition) continue;
            
            const distance = getDistance(myPlayer.x, myPlayer.y, taskPosition.x, taskPosition.y);
            if (distance < minDistance) {
                minDistance = distance;
                nearestTask = task;
            }
        }
        
        return nearestTask;
    }
    
    canDoTask(task) {
        if (!task) return false;
        if (this.getMyRole() !== Config.ROLES.CREWMATE) return false;
        
        const myPlayer = this.getMyPlayer();
        const map = Config.MAPS[this.gameState.map];
        
        // Görev konumunu bul
        const taskPosition = map.tasks.find(t => t.name === task.name)?.positions[0];
        if (!taskPosition) return false;
        
        const distance = getDistance(myPlayer.x, myPlayer.y, taskPosition.x, taskPosition.y);
        return distance < 30; // Görev yapma mesafesi
    }
    
    findNearestBody() {
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return null;
        
        const bodies = this.gameState.bodies || [];
        if (bodies.length === 0) return null;
        
        let nearestBody = null;
        let minDistance = Infinity;
        
        for (const body of bodies) {
            const distance = getDistance(myPlayer.x, myPlayer.y, body.x, body.y);
            if (distance < minDistance && distance < 200) {
                minDistance = distance;
                nearestBody = body;
            }
        }
        
        return nearestBody;
    }
    
    canReport(body) {
        if (!body) return false;
        if (this.cooldowns.report > 0) return false;
        
        const myPlayer = this.getMyPlayer();
        const distance = getDistance(myPlayer.x, myPlayer.y, body.x, body.y);
        return distance < 50; // Bildirme mesafesi
    }
    
    findRandomPosition() {
        const map = Config.MAPS[this.gameState.map];
        const spawnPoints = map.spawnPoints || [];
        
        if (spawnPoints.length > 0) {
            return getRandomElement(spawnPoints);
        }
        
        // Rastgele konum
        return {
            x: Math.random() * map.width,
            y: Math.random() * map.height
        };
    }
    
    decideVoteTarget() {
        const role = this.getMyRole();
        const alivePlayers = this.gameState.players.filter(p => !p.isDead && p.id !== this.botId);
        
        if (alivePlayers.length === 0) return null;
        
        // Imposter için
        if (role === Config.ROLES.IMPOSTER) {
            // Rastgele bir crewmate seç
            const crewmates = alivePlayers.filter(p => p.role === Config.ROLES.CREWMATE);
            if (crewmates.length > 0) {
                return getRandomElement(crewmates).id;
            }
            return getRandomElement(alivePlayers).id;
        }
        
        // Crewmate için
        if (role === Config.ROLES.CREWMATE) {
            // Şüphelilerden birini seç
            if (this.memory.suspiciousPlayers.length > 0) {
                const suspicious = this.memory.suspiciousPlayers.filter(id => 
                    alivePlayers.some(p => p.id === id)
                );
                if (suspicious.length > 0) {
                    return getRandomElement(suspicious);
                }
            }
            
            // Rastgele bir oyuncu seç (bazı durumlarda oy kullanma)
            if (Math.random() < this.behavior.voteInnocent) {
                return getRandomElement(alivePlayers).id;
            } else {
                return null; // Oy kullanma
            }
        }
        
        return getRandomElement(alivePlayers).id;
    }
    
    generateMeetingMessage() {
        const role = this.getMyRole();
        const messages = {
            imposter: [
                "Benimle gelin, orada bir şeyler var!",
                "Gördüm, ama kimse inanmadı.",
                "Sakin olun, her şey kontrol altında.",
                "Bence {player} şüpheli.",
                "Kameralar bozuk, dikkat edin.",
                "Ben oradaydım, hiçbir şey görmedim.",
                "Hızlı davranmalıyız!",
                "Bence {player} yalan söylüyor."
            ],
            crewmate: [
                "Ceset buldum! Hemen gelin!",
                "{player} son zamanlarda garip davranıyor.",
                "Görevlerimi yapıyordum, bir şeyler oldu.",
                "Birlikte olmalıyız, ayrılmayın.",
                "Kameralarda bir şeyler gördüm.",
                "Dikkatli olun, imposter yakınlarda olabilir.",
                "Benimle gelin, güvenli.",
                "Bence {player} temiz."
            ]
        };
        
        const messageList = role === Config.ROLES.IMPOSTER ? messages.imposter : messages.crewmate;
        let message = getRandomElement(messageList);
        
        // {player} placeholderını değiştir
        const alivePlayers = this.gameState.players.filter(p => !p.isDead && p.id !== this.botId);
        if (alivePlayers.length > 0 && message.includes('{player}')) {
            const randomPlayer = getRandomElement(alivePlayers);
            message = message.replace('{player}', randomPlayer.name);
        }
        
        return message;
    }
    
    executeAction(action) {
        switch (action.type) {
            case 'move':
                this.executeMove(action.position);
                break;
            case 'task':
                this.executeTask(action.task);
                break;
            case 'kill':
                this.executeKill(action.target);
                break;
            case 'vent':
                this.executeVent(action.vent);
                break;
            case 'report':
                this.executeReport(action.body);
                break;
            case 'emergency':
                this.executeEmergency();
                break;
            case 'speak':
                this.executeSpeak(action.message);
                break;
            case 'vote':
                this.executeVote(action.target);
                break;
        }
    }
    
    executeMove(position) {
        // Botu yeni konuma hareket ettir
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return;
        
        // Yön hesapla
        const angle = getAngle(myPlayer.x, myPlayer.y, position.x, position.y);
        
        // Yeni konum
        const speed = this.getMyRole() === Config.ROLES.IMPOSTER 
            ? Config.GRAPHICS_CONFIG.IMPOSTER_SPEED 
            : Config.GRAPHICS_CONFIG.CREWMATE_SPEED;
        
        const distance = getDistance(myPlayer.x, myPlayer.y, position.x, position.y);
        const moveDistance = Math.min(distance, speed * 0.1);
        
        myPlayer.x += Math.cos(angle) * moveDistance;
        myPlayer.y += Math.sin(angle) * moveDistance;
        myPlayer.direction = getDirection(myPlayer.x, myPlayer.y, position.x, position.y);
        
        // Animasyonu güncelle
        if (moveDistance > 0) {
            animateCrewmateWalk(myPlayer, 100);
        }
    }
    
    executeTask(task) {
        if (!this.canDoTask(task)) return;
        
        this.cooldowns.task = 2; // Görev cooldown
        
        // Görevi tamamla
        EventBus.emit('bot_task_complete', {
            botId: this.botId,
            taskId: task.id
        });
        
        // Animasyon
        const myPlayer = this.getMyPlayer();
        if (myPlayer) {
            animateCrewmateTask(myPlayer, 1000);
        }
    }
    
    executeKill(target) {
        if (!this.canKill(target)) return;
        
        this.cooldowns.kill = Config.BOT_BEHAVIORS.IMPOSTER.killCooldown;
        
        // Öldürme eylemi
        EventBus.emit('bot_kill', {
            botId: this.botId,
            targetId: target.id
        });
        
        // Animasyon ve ses
        const myPlayer = this.getMyPlayer();
        if (myPlayer) {
            animateKill(myPlayer, 500);
        }
        
        // Kan efekti
        if (target.x && target.y) {
            particleSystem.createBloodSplatter(target.x, target.y);
        }
    }
    
    executeVent(vent) {
        if (!this.canVent(vent)) return;
        
        this.cooldowns.vent = Config.BOT_BEHAVIORS.IMPOSTER.ventCooldown;
        
        // Havalandırma eylemi
        EventBus.emit('bot_vent', {
            botId: this.botId,
            vent: vent
        });
        
        // Animasyon
        const myPlayer = this.getMyPlayer();
        if (myPlayer) {
            animateCrewmateVent(myPlayer, 1000);
        }
    }
    
    executeReport(body) {
        if (!this.canReport(body)) return;
        
        this.cooldowns.report = Config.REPORT_COOLDOWN;
        
        // Bildirme eylemi
        EventBus.emit('bot_report', {
            botId: this.botId,
            bodyId: body.id
        });
        
        // Animasyon
        const myPlayer = this.getMyPlayer();
        if (myPlayer) {
            animateCrewmateReport(myPlayer, 500);
        }
    }
    
    executeEmergency() {
        this.cooldowns.meeting = Config.EMERGENCY_COOLDOWN;
        
        // Acil durum toplantısı çağırma
        EventBus.emit('bot_emergency', {
            botId: this.botId
        });
    }
    
    executeSpeak(message) {
        // Mesaj gönder
        EventBus.emit('bot_speak', {
            botId: this.botId,
            message: message
        });
    }
    
    executeVote(target) {
        // Oy kullan
        EventBus.emit('bot_vote', {
            botId: this.botId,
            targetId: target
        });
    }
}

// ===== Bot Yöneticisi =====
class BotManager {
    constructor() {
        this.bots = new Map();
        this.gameState = null;
        this.botCount = 0;
        this.maxBots = Config.MAX_BOTS;
    }
    
    setGameState(gameState) {
        this.gameState = gameState;
        
        // Tüm botları güncelle
        for (const [id, bot] of this.bots) {
            bot.gameState = gameState;
        }
    }
    
    addBot(roomId, color = null, difficulty = Config.BOT_DIFFICULTY.NORMAL) {
        if (this.botCount >= this.maxBots) return null;
        
        const botId = `bot_${Date.now()}_${this.botCount}`;
        const username = `Bot_${this.botCount + 1}`;
        const availableColors = Object.keys(Config.COLORS).filter(c => 
            !this.gameState.players.some(p => p.color === c)
        );
        
        const botColor = color || getRandomElement(availableColors);
        
        const botAI = new BotAI(botId, this.gameState, difficulty);
        
        this.bots.set(botId, botAI);
        this.botCount++;
        
        // Botu oyuna ekle
        const newBot = {
            id: botId,
            name: username,
            color: botColor,
            role: Math.random() < 0.25 ? Config.ROLES.IMPOSTER : Config.ROLES.CREWMATE,
            isBot: true,
            isDead: false,
            x: Math.random() * Config.MAPS[this.gameState.map].width,
            y: Math.random() * Config.MAPS[this.gameState.map].height,
            room: 'main'
        };
        
        EventBus.emit('bot_added', { bot: newBot, botAI: botAI });
        
        return botId;
    }
    
    removeBot(botId) {
        const botAI = this.bots.get(botId);
        if (!botAI) return false;
        
        this.bots.delete(botId);
        this.botCount--;
        
        EventBus.emit('bot_removed', { botId: botId });
        return true;
    }
    
    removeAllBots() {
        for (const [botId] of this.bots) {
            this.removeBot(botId);
        }
    }
    
    getBot(botId) {
        return this.bots.get(botId);
    }
    
    update(deltaTime) {
        for (const [id, bot] of this.bots) {
            bot.update(this.gameState, deltaTime);
        }
    }
    
    getBotCount() {
        return this.botCount;
    }
    
    setMaxBots(max) {
        this.maxBots = max;
    }
}

// ===== Zeki Bot AI (Gelişmiş) =====
class SmartBotAI extends BotAI {
    constructor(botId, gameState) {
        super(botId, gameState, Config.BOT_DIFFICULTY.HARD);
        this.memory = {
            ...this.memory,
            playerBehaviors: {},
            lastPositions: {},
            movementPatterns: {}
        };
    }
    
    updateMemory() {
        super.updateMemory();
        
        // Oyuncu davranışlarını izle
        for (const player of this.gameState.players) {
            if (player.id === this.botId || player.isBot) continue;
            
            // Konum değişikliklerini kaydet
            if (!this.memory.lastPositions[player.id]) {
                this.memory.lastPositions[player.id] = { x: player.x, y: player.y, time: Date.now() };
            } else {
                const lastPos = this.memory.lastPositions[player.id];
                const distance = getDistance(lastPos.x, lastPos.y, player.x, player.y);
                const timeDiff = (Date.now() - lastPos.time) / 1000;
                const speed = distance / timeDiff;
                
                // Hareket kalıplarını kaydet
                if (!this.memory.movementPatterns[player.id]) {
                    this.memory.movementPatterns[player.id] = [];
                }
                this.memory.movementPatterns[player.id].push({ distance, speed, time: Date.now() });
                
                // Son 10 hareketi sakla
                if (this.memory.movementPatterns[player.id].length > 10) {
                    this.memory.movementPatterns[player.id].shift();
                }
                
                this.memory.lastPositions[player.id] = { x: player.x, y: player.y, time: Date.now() };
            }
        }
    }
    
    findKillTarget() {
        // Zeki bot, daha akıllı hedef seçimleri yapar
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return null;
        
        const alivePlayers = this.gameState.players.filter(p => 
            !p.isDead && 
            p.id !== this.botId && 
            p.role === Config.ROLES.CREWMATE
        );
        
        if (alivePlayers.length === 0) return null;
        
        // Yalnız oyuncuları hedefle
        const isolatedPlayers = alivePlayers.filter(p => {
            const nearbyPlayers = alivePlayers.filter(other => 
                other.id !== p.id && 
                getDistance(p.x, p.y, other.x, other.y) < 200
            );
            return nearbyPlayers.length === 0;
        });
        
        if (isolatedPlayers.length > 0) {
            // En yakını seç
            return isolatedPlayers.reduce((closest, player) => {
                const distClosest = getDistance(myPlayer.x, myPlayer.y, closest.x, closest.y);
                const distPlayer = getDistance(myPlayer.x, myPlayer.y, player.x, player.y);
                return distPlayer < distClosest ? player : closest;
            }, isolatedPlayers[0]);
        }
        
        // Hızlı hareket eden oyuncuları hedefle (şüpheli davranış)
        const fastMovingPlayers = [];
        for (const player of alivePlayers) {
            if (this.memory.movementPatterns[player.id]) {
                const avgSpeed = this.memory.movementPatterns[player.id]
                    .reduce((sum, m) => sum + m.speed, 0) /
                    this.memory.movementPatterns[player.id].length;
                
                if (avgSpeed > 250) { // Normal hız: 200, imposter hızı: 220
                    fastMovingPlayers.push(player);
                }
            }
        }
        
        if (fastMovingPlayers.length > 0) {
            return getRandomElement(fastMovingPlayers);
        }
        
        // Varsayılan: en yakını seç
        return super.findKillTarget();
    }
    
    decideVoteTarget() {
        const role = this.getMyRole();
        const alivePlayers = this.gameState.players.filter(p => !p.isDead && p.id !== this.botId);
        
        if (alivePlayers.length === 0) return null;
        
        // Zeki bot, davranış analizi yapar
        if (role === Config.ROLES.CREWMATE) {
            // Şüpheli davranış sergileyen oyuncuları bul
            const suspiciousPlayers = [];
            
            for (const player of alivePlayers) {
                if (player.isBot) continue;
                
                // Hareket kalıplarını analiz et
                if (this.memory.movementPatterns[player.id]) {
                    const movements = this.memory.movementPatterns[player.id];
                    const avgSpeed = movements.reduce((sum, m) => sum + m.speed, 0) / movements.length;
                    
                    // Çok hızlı hareket edenler şüpheli
                    if (avgSpeed > 230) {
                        suspiciousPlayers.push(player);
                        continue;
                    }
                }
                
                // Ceset yanında görülme
                if (this.memory.lastSeenPlayers[player.id]) {
                    const lastSeen = this.memory.lastSeenPlayers[player.id];
                    const bodies = this.gameState.bodies || [];
                    
                    for (const body of bodies) {
                        const bodyTime = body.time || 0;
                        const seenTime = lastSeen.time || 0;
                        
                        if (Math.abs(seenTime - bodyTime) < 5000) { // 5 saniye içinde
                            const distance = getDistance(
                                lastSeen.x, lastSeen.y,
                                body.x, body.y
                            );
                            if (distance < 100) {
                                suspiciousPlayers.push(player);
                                break;
                            }
                        }
                    }
                }
            }
            
            if (suspiciousPlayers.length > 0) {
                // En şüpheliyi seç
                return suspiciousPlayers[0].id;
            }
        }
        
        // Varsayılan davranış
        return super.decideVoteTarget();
    }
    
    generateMeetingMessage() {
        const role = this.getMyRole();
        const messages = {
            imposter: [
                "{player} son zamanlarda çok yalnız dolaşıyor.",
                "Görevlerimi yaparken garip sesler duydum.",
                "Kameralar {player} yanında bozuktu, ilginç.",
                "Bence {player} imposter, kanıtım var.",
                "{player} ve {player2} birlikteydiler, şüpheli.",
                "Ceset bulduğumda {player} yakınlardaydı."
            ],
            crewmate: [
                "{player} çok hızlı hareket ediyor, normal değil.",
                "{player} ceset yanında görülmüştü.",
                "{player} ve {player2} sürekli birlikte, garip.",
                "Görevimi yaparken {player} beni izliyordu.",
                "Kameralarda {player} görülmüyordu, neredeydi?",
                "{player} imposter olabilir, dikkatli olun."
            ]
        };
        
        const messageList = role === Config.ROLES.IMPOSTER ? messages.imposter : messages.crewmate;
        let message = getRandomElement(messageList);
        
        // Player placeholderlarını değiştir
        const alivePlayers = this.gameState.players.filter(p => !p.isDead && p.id !== this.botId);
        if (alivePlayers.length > 0) {
            const randomPlayer = getRandomElement(alivePlayers);
            message = message.replace('{player}', randomPlayer.name);
            
            if (message.includes('{player2}') && alivePlayers.length > 1) {
                const randomPlayer2 = getRandomElement(
                    alivePlayers.filter(p => p.id !== randomPlayer.id)
                );
                message = message.replace('{player2}', randomPlayer2.name);
            }
        }
        
        return message;
    }
}

// ===== Global Bot Yöneticisi =====
const botManager = new BotManager();

// ===== Bot AI Kütüphanesi =====
const BotAILibrary = {
    BotAI,
    SmartBotAI,
    BotManager,
    botManager,
    
    // Bot oluşturma fonksiyonları
    createBot: (roomId, color, difficulty) => {
        return botManager.addBot(roomId, color, difficulty);
    },
    
    createSmartBot: (roomId, color) => {
        // Akıllı bot oluştur
        const botId = botManager.addBot(roomId, color, Config.BOT_DIFFICULTY.HARD);
        if (botId) {
            // BotAI'yı SmartBotAI ile değiştir
            const gameState = botManager.gameState;
            const smartBot = new SmartBotAI(botId, gameState);
            botManager.bots.set(botId, smartBot);
        }
        return botId;
    },
    
    removeBot: (botId) => {
        return botManager.removeBot(botId);
    },
    
    removeAllBots: () => {
        botManager.removeAllBots();
    },
    
    updateBots: (deltaTime) => {
        botManager.update(deltaTime);
    },
    
    setGameState: (gameState) => {
        botManager.setGameState(gameState);
    },
    
    getBotCount: () => {
        return botManager.getBotCount();
    }
};
