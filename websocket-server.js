// ===== AMONG US TÜRKÇE - WEBSOCKET SUNUCUSU =====
// Node.js tabanlı WebSocket sunucusu

const WebSocket = require('ws');
const http = require('http');
const url = require('url');

// ===== Sunucu Yapılandırması =====
const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0';

// ===== Oda Yöneticisi =====
class RoomManager {
    constructor() {
        this.rooms = new Map();
        this.maxRooms = 100;
        this.clients = new Map(); // clientId -> { client, roomCode, playerId }
    }
    
    // Oda kodu oluştur
    generateRoomCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    
    // Oyuncu ID'si oluştur
    generatePlayerId() {
        return 'player_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }
    
    // Bot ID'si oluştur
    generateBotId() {
        return 'bot_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }
    
    // Görev ID'si oluştur
    generateTaskId() {
        return 'task_' + Date.now() + '_' + Math.floor(Math.random() * 10000);
    }
    
    // Harita verilerini al
    getMapData(mapName) {
        const maps = {
            skeld: {
                name: 'The Skeld',
                width: 2000,
                height: 1500,
                spawnPoints: [
                    {x: 200, y: 200}, {x: 500, y: 200}, {x: 800, y: 200}, {x: 1200, y: 200}, {x: 1500, y: 200},
                    {x: 200, y: 500}, {x: 500, y: 500}, {x: 800, y: 500}, {x: 1200, y: 500}, {x: 1500, y: 500}
                ],
                tasks: [
                    {name: 'Scan Card', count: 2}, {name: 'Fix Wires', count: 2},
                    {name: 'Fuel', count: 1}, {name: 'Stop Sabotage', count: 2}, {name: 'Download Data', count: 1}
                ]
            },
            mira: {
                name: 'Mira HQ',
                width: 1800,
                height: 1200,
                spawnPoints: [
                    {x: 200, y: 200}, {x: 400, y: 200}, {x: 600, y: 200}, {x: 800, y: 200}, {x: 1000, y: 200},
                    {x: 200, y: 500}, {x: 400, y: 500}, {x: 600, y: 500}, {x: 800, y: 500}, {x: 1000, y: 500}
                ],
                tasks: [
                    {name: 'Scan Card', count: 2}, {name: 'Fix Wires', count: 2},
                    {name: 'Fuel', count: 1}, {name: 'Stop Sabotage', count: 2}, {name: 'Download Data', count: 1}
                ]
            },
            polus: {
                name: 'Polus',
                width: 2200,
                height: 1600,
                spawnPoints: [
                    {x: 200, y: 300}, {x: 500, y: 300}, {x: 800, y: 300}, {x: 1200, y: 300}, {x: 1500, y: 300},
                    {x: 200, y: 700}, {x: 500, y: 700}, {x: 800, y: 700}, {x: 1200, y: 700}, {x: 1500, y: 700}
                ],
                tasks: [
                    {name: 'Scan Card', count: 2}, {name: 'Fix Wires', count: 2},
                    {name: 'Fuel', count: 2}, {name: 'Stop Sabotage', count: 2}, {name: 'Download Data', count: 2}
                ]
            }
        };
        return maps[mapName] || maps.skeld;
    }
    
    // Oda oluştur
    createRoom(roomData, hostPlayer) {
        if (this.rooms.size >= this.maxRooms) {
            return {success: false, message: 'Maximum rooms reached'}; 
        }
        
        const roomCode = this.generateRoomCode();
        const hostId = this.generatePlayerId();
        
        const room = {
            roomCode,
            roomName: roomData.roomName || 'New Room',
            map: roomData.map || 'skeld',
            maxPlayers: Math.min(roomData.maxPlayers || 10, 10),
            imposterCount: Math.min(roomData.imposterCount || 1, Math.floor((roomData.maxPlayers || 10) / 2)),
            players: [],
            tasks: [],
            bodies: [],
            state: 'waiting',
            hostId,
            createdAt: Date.now(),
            lastActivity: Date.now(),
            addBots: roomData.addBots || false,
            botCount: Math.min(roomData.botCount || 0, 8)
        };
        
        hostPlayer.id = hostId;
        hostPlayer.isHost = true;
        hostPlayer.isDead = false;
        hostPlayer.role = null;
        hostPlayer.x = 0;
        hostPlayer.y = 0;
        hostPlayer.room = 'main';
        hostPlayer.joinedAt = Date.now();
        hostPlayer.isBot = false;
        
        room.players.push(hostPlayer);
        this.rooms.set(roomCode, room);
        
        return {success: true, room, playerId: hostId, hostId, isAdmin: false};
    }
    
    // Odaya katıl
    joinRoom(roomCode, player) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        if (room.players.length >= room.maxPlayers) return {success: false, message: 'Room is full'};
        if (room.state === 'playing') return {success: false, message: 'Game already started'};
        
        const playerId = this.generatePlayerId();
        player.id = playerId;
        player.isHost = false;
        player.isDead = false;
        player.role = null;
        player.x = 0;
        player.y = 0;
        player.room = 'main';
        player.joinedAt = Date.now();
        player.isBot = false;
        
        room.players.push(player);
        room.lastActivity = Date.now();
        
        return {success: true, room, playerId, hostId: room.hostId, isAdmin: false};
    }
    
    // Odadan ayrıl
    leaveRoom(roomCode, playerId) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        const playerIndex = room.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return {success: false, message: 'Player not found'};
        
        const isHost = room.players[playerIndex].isHost || false;
        const playerName = room.players[playerIndex].name;
        
        room.players.splice(playerIndex, 1);
        
        if (isHost && room.players.length > 0) {
            room.players[0].isHost = true;
            room.hostId = room.players[0].id;
        }
        
        if (room.players.length === 0) {
            this.rooms.delete(roomCode);
            return {success: true, message: 'Room deleted'};
        }
        
        room.lastActivity = Date.now();
        
        return {success: true, room, playerName};
    }
    
    // Oyunu başlat
    startGame(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        if (room.players.length < 4) return {success: false, message: 'Minimum 4 players required'};
        if (room.state === 'playing') return {success: false, message: 'Game already started'};
        
        this.assignRoles(room);
        this.createTasks(room);
        
        if (room.addBots && room.botCount > 0) {
            this.addBots(room, room.botCount);
        }
        
        room.state = 'playing';
        room.gameStartTime = Date.now();
        room.lastActivity = Date.now();
        
        return {success: true, room, gameState: this.getGameStateForPlayers(room)};
    }
    
    // Roller ata
    assignRoles(room) {
        const players = room.players;
        const imposterCount = Math.min(room.imposterCount, Math.floor(players.length / 2));
        
        players.forEach(p => p.role = 'crewmate');
        
        const imposterIndices = [];
        while (imposterIndices.length < imposterCount) {
            const index = Math.floor(Math.random() * players.length);
            if (!imposterIndices.includes(index)) {
                imposterIndices.push(index);
            }
        }
        
        imposterIndices.forEach(index => {
            players[index].role = 'imposter';
        });
    }
    
    // Görevleri oluştur
    createTasks(room) {
        const map = this.getMapData(room.map);
        const tasks = [];
        
        map.tasks.forEach(taskTemplate => {
            for (let i = 0; i < (taskTemplate.count || 1); i++) {
                tasks.push({
                    id: this.generateTaskId(),
                    name: taskTemplate.name,
                    completed: false,
                    completedBy: null
                });
            }
        });
        
        // Karıştır
        for (let i = tasks.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [tasks[i], tasks[j]] = [tasks[j], tasks[i]];
        }
        
        room.tasks = tasks;
    }
    
    // Bot ekle
    addBots(room, count) {
        const colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'brown', 'lime'];
        const map = this.getMapData(room.map);
        
        for (let i = 0; i < count; i++) {
            const usedColors = room.players.map(p => p.color);
            const availableColors = colors.filter(c => !usedColors.includes(c));
            const color = availableColors.length > 0 ? availableColors[Math.floor(Math.random() * availableColors.length)] : colors[Math.floor(Math.random() * colors.length)];
            
            const spawnPoint = map.spawnPoints[Math.floor(Math.random() * map.spawnPoints.length)];
            
            const bot = {
                id: this.generateBotId(),
                name: 'Bot_' + (i + 1),
                color,
                role: null,
                isHost: false,
                isDead: false,
                isBot: true,
                x: spawnPoint.x,
                y: spawnPoint.y,
                room: 'main',
                joinedAt: Date.now()
            };
            
            room.players.push(bot);
        }
        
        // Roller yeniden ata
        this.assignRoles(room);
    }
    
    // Oyuncu hareketi
    movePlayer(roomCode, playerId, x, y, direction) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) return {success: false, message: 'Player not found'};
        
        player.x = Math.floor(x);
        player.y = Math.floor(y);
        player.direction = direction;
        room.lastActivity = Date.now();
        
        return {success: true, player, playerId};
    }
    
    // Görev tamamla
    completeTask(roomCode, playerId, taskId) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) return {success: false, message: 'Player not found'};
        if (player.role !== 'crewmate') return {success: false, message: 'Only crewmates can do tasks'};
        if (player.isDead) return {success: false, message: 'Dead players cannot do tasks'};
        
        const task = room.tasks.find(t => t.id === taskId);
        if (!task) return {success: false, message: 'Task not found'};
        if (task.completed) return {success: false, message: 'Task already completed'};
        
        task.completed = true;
        task.completedBy = playerId;
        room.lastActivity = Date.now();
        
        this.checkGameEnd(room);
        
        return {success: true, taskId, playerId};
    }
    
    // Oyuncu öldür
    killPlayer(roomCode, killerId, playerId) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        const killer = room.players.find(p => p.id === killerId);
        if (!killer) return {success: false, message: 'Killer not found'};
        if (killer.role !== 'imposter') return {success: false, message: 'Only imposters can kill'};
        if (killer.isDead) return {success: false, message: 'Dead players cannot kill'};
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) return {success: false, message: 'Player not found'};
        if (player.isDead) return {success: false, message: 'Player already dead'};
        if (player.role === 'imposter') return {success: false, message: 'Cannot kill imposters'};
        
        player.isDead = true;
        player.deathTime = Date.now();
        player.killedBy = killerId;
        
        room.bodies.push({
            id: 'body_' + Date.now() + '_' + playerId,
            playerId,
            x: player.x,
            y: player.y,
            time: Date.now()
        });
        
        room.lastActivity = Date.now();
        this.checkGameEnd(room);
        
        return {success: true, playerId, killerId};
    }
    
    // Ceset bildir
    reportBody(roomCode, playerId, bodyId) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) return {success: false, message: 'Player not found'};
        
        const body = room.bodies.find(b => b.id === bodyId);
        if (!body) return {success: false, message: 'Body not found'};
        
        room.state = 'meeting';
        room.meetingBody = body;
        room.meetingCalledBy = playerId;
        room.lastActivity = Date.now();
        
        return {success: true, body, reportedBy: playerId};
    }
    
    // Toplantı çağır
    callMeeting(roomCode, playerId) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) return {success: false, message: 'Player not found'};
        
        room.state = 'meeting';
        room.meetingCalledBy = playerId;
        room.meetingBody = null;
        room.lastActivity = Date.now();
        
        return {success: true, calledBy: playerId};
    }
    
    // Oy kullan
    castVote(roomCode, playerId, targetId) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) return {success: false, message: 'Player not found'};
        
        room.votes[playerId] = targetId;
        room.lastActivity = Date.now();
        
        return {success: true, playerId, targetId};
    }
    
    // Toplantıyı sonlandır
    endMeeting(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        room.state = 'voting';
        room.votes = {};
        room.lastActivity = Date.now();
        
        return {success: true};
    }
    
    // Oylamayı sonlandır
    endVoting(roomCode) {
        const room = this.rooms.get(roomCode);
        if (!room) return {success: false, message: 'Room not found'};
        
        const votes = room.votes;
        const voteCounts = {};
        
        Object.values(votes).forEach(target => {
            if (target !== null) {
                voteCounts[target] = (voteCounts[target] || 0) + 1;
            }
        });
        
        let maxVotes = 0;
        let ejectedPlayerId = null;
        let tie = false;
        
        Object.entries(voteCounts).forEach(([playerId, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                ejectedPlayerId = playerId;
                tie = false;
            } else if (count === maxVotes && maxVotes > 0) {
                tie = true;
            }
        });
        
        if (ejectedPlayerId && !tie) {
            const player = room.players.find(p => p.id === ejectedPlayerId);
            if (player) {
                player.isDead = true;
                player.ejected = true;
                player.deathTime = Date.now();
            }
        }
        
        room.state = 'playing';
        room.votes = {};
        room.meetingCalledBy = null;
        room.meetingBody = null;
        room.bodies = [];
        room.lastActivity = Date.now();
        
        this.checkGameEnd(room);
        
        return {success: true, ejectedPlayerId};
    }
    
    // Oyun sonu kontrolü
    checkGameEnd(room) {
        const crewmates = room.players.filter(p => !p.isDead && p.role === 'crewmate');
        const imposters = room.players.filter(p => !p.isDead && p.role === 'imposter');
        
        const allTasksCompleted = room.tasks.every(t => t.completed);
        
        if (allTasksCompleted && imposters.length === 0) {
            room.state = 'ended';
            room.winner = 'crewmate';
            room.gameEndTime = Date.now();
            return;
        }
        
        if (crewmates.length <= imposters.length) {
            room.state = 'ended';
            room.winner = 'imposter';
            room.gameEndTime = Date.now();
            return;
        }
    }
    
    // Oyuncuya özel oyun durumunu al
    getGameStateForPlayer(roomCode, playerId) {
        const room = this.rooms.get(roomCode);
        if (!room) return null;
        
        const player = room.players.find(p => p.id === playerId);
        if (!player) return null;
        
        const gameState = {
            roomCode: room.roomCode,
            roomName: room.roomName,
            map: room.map,
            maxPlayers: room.maxPlayers,
            imposterCount: room.imposterCount,
            state: room.state,
            timer: room.gameStartTime ? Math.floor((Date.now() - room.gameStartTime) / 1000) : 0,
            players: room.players.map(p => ({
                id: p.id,
                name: p.name,
                color: p.color,
                isDead: p.isDead,
                isHost: p.isHost,
                isBot: p.isBot || false,
                x: p.x,
                y: p.y,
                role: p.role
            })),
            tasks: room.tasks.map(t => ({
                id: t.id,
                name: t.name,
                completed: t.completed,
                completedBy: t.completedBy
            })),
            bodies: room.bodies.map(b => ({
                id: b.id,
                playerId: b.playerId,
                x: b.x,
                y: b.y
            })),
            myRole: player.role
        };
        
        if (room.state === 'meeting') {
            gameState.meetingCalledBy = room.meetingCalledBy;
            gameState.meetingBody = room.meetingBody ? {
                id: room.meetingBody.id,
                playerId: room.meetingBody.playerId,
                x: room.meetingBody.x,
                y: room.meetingBody.y
            } : null;
        }
        
        if (room.state === 'voting') {
            gameState.votes = room.votes;
        }
        
        return gameState;
    }
    
    // Odayı al
    getRoom(roomCode) {
        return this.rooms.get(roomCode) || null;
    }
    
    // Tüm odaları al
    getAllRooms() {
        return Array.from(this.rooms.values());
    }
    
    // Açık odaları listele
    listOpenRooms() {
        const openRooms = [];
        this.rooms.forEach(room => {
            if (room.state === 'waiting' && room.players.length < room.maxPlayers) {
                openRooms.push({
                    roomCode: room.roomCode,
                    roomName: room.roomName,
                    playerCount: room.players.length,
                    maxPlayers: room.maxPlayers,
                    map: room.map
                });
            }
        });
        return openRooms;
    }
    
    // Odayı sil
    deleteRoom(roomCode) {
        return this.rooms.delete(roomCode);
    }
}

// ===== WebSocket Sunucusu =====
class WebSocketServer {
    constructor() {
        this.roomManager = new RoomManager();
        this.clients = new Map(); // clientId -> { client, roomCode, playerId }
    }
    
    start(port = PORT) {
        const server = http.createServer();
        const wss = new WebSocket.Server({ server });
        
        wss.on('connection', (ws, req) => {
            const clientId = Date.now() + '_' + Math.floor(Math.random() * 10000);
            const ip = req.socket.remoteAddress;
            
            console.log(`New connection: ${clientId} from ${ip}`);
            
            this.clients.set(clientId, { client: ws, roomCode: null, playerId: null });
            
            ws.on('message', (message) => this.handleMessage(clientId, message));
            ws.on('close', () => this.handleClose(clientId));
            ws.on('error', (error) => this.handleError(clientId, error));
            
            // Hoş geldin mesajı
            ws.send(JSON.stringify({ type: 'connected', message: 'Among Us Türkçe sunucusuna hoş geldiniz' }));
        });
        
        wss.on('error', (error) => {
            console.error('WebSocket error:', error);
        });
        
        server.listen(port, HOST, () => {
            console.log(`WebSocket sunucusu ${HOST}:${port} adresinde çalışıyor`);
        });
        
        return server;
    }
    
    handleMessage(clientId, message) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        try {
            const data = JSON.parse(message);
            console.log(`Message from ${clientId}: ${data.type}`);
            
            this.processMessage(clientId, data);
        } catch (error) {
            console.error('Error parsing message:', error);
            client.client.send(JSON.stringify({ type: 'error', message: 'Geçersiz mesaj formatı' }));
        }
    }
    
    processMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        switch (data.type) {
            case 'create_room':
                this.handleCreateRoom(clientId, data);
                break;
            case 'join_room':
                this.handleJoinRoom(clientId, data);
                break;
            case 'leave_room':
                this.handleLeaveRoom(clientId, data);
                break;
            case 'start_game':
                this.handleStartGame(clientId, data);
                break;
            case 'player_move':
                this.handlePlayerMove(clientId, data);
                break;
            case 'complete_task':
                this.handleCompleteTask(clientId, data);
                break;
            case 'kill_player':
                this.handleKillPlayer(clientId, data);
                break;
            case 'report_body':
                this.handleReportBody(clientId, data);
                break;
            case 'call_meeting':
                this.handleCallMeeting(clientId, data);
                break;
            case 'cast_vote':
                this.handleCastVote(clientId, data);
                break;
            case 'end_meeting':
                this.handleEndMeeting(clientId, data);
                break;
            case 'end_voting':
                this.handleEndVoting(clientId, data);
                break;
            case 'chat_message':
                this.handleChatMessage(clientId, data);
                break;
            case 'sync_state':
                this.handleSyncState(clientId, data);
                break;
            case 'ping':
                client.client.send(JSON.stringify({ type: 'pong' }));
                break;
            default:
                client.client.send(JSON.stringify({ type: 'error', message: 'Bilinmeyen mesaj tipi' }));
                break;
        }
    }
    
    handleCreateRoom(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const result = this.roomManager.createRoom(data.room, data.player);
        
        if (result.success) {
            client.roomCode = result.room.roomCode;
            client.playerId = result.playerId;
            
            client.client.send(JSON.stringify({
                type: 'room_joined',
                room: result.room,
                playerId: result.playerId,
                hostId: result.hostId,
                isAdmin: result.isAdmin
            }));
        } else {
            client.client.send(JSON.stringify({
                type: 'error',
                message: result.message
            }));
        }
    }
    
    handleJoinRoom(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        const result = this.roomManager.joinRoom(data.roomCode, data.player);
        
        if (result.success) {
            client.roomCode = data.roomCode;
            client.playerId = result.playerId;
            
            client.client.send(JSON.stringify({
                type: 'room_joined',
                room: result.room,
                playerId: result.playerId,
                hostId: result.hostId,
                isAdmin: result.isAdmin
            }));
            
            // Diğer oyunculara bildir
            this.broadcastToRoom(data.roomCode, JSON.stringify({
                type: 'player_joined',
                player: {
                    id: result.playerId,
                    name: data.player.name,
                    color: data.player.color,
                    isHost: false,
                    isBot: false
                }
            }), clientId);
        } else {
            client.client.send(JSON.stringify({
                type: 'error',
                message: result.message
            }));
        }
    }
    
    handleLeaveRoom(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        if (client.roomCode && client.playerId) {
            const result = this.roomManager.leaveRoom(client.roomCode, client.playerId);
            
            if (result.success) {
                this.broadcastToRoom(client.roomCode, JSON.stringify({
                    type: 'player_left',
                    playerId: client.playerId,
                    playerName: result.playerName || 'Unknown'
                }));
            }
            
            client.roomCode = null;
            client.playerId = null;
        }
    }
    
    handleStartGame(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.startGame(client.roomCode);
        
        if (result.success) {
            this.broadcastToRoom(client.roomCode, JSON.stringify({
                type: 'game_started',
                gameState: result.gameState
            }));
        } else {
            client.client.send(JSON.stringify({
                type: 'error',
                message: result.message
            }));
        }
    }
    
    handlePlayerMove(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.movePlayer(
            client.roomCode, data.playerId, data.x, data.y, data.direction
        );
        
        if (result.success) {
            this.broadcastToRoom(client.roomCode, JSON.stringify({
                type: 'player_updated',
                playerId: data.playerId,
                player: result.player
            }), clientId);
        }
    }
    
    handleCompleteTask(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.completeTask(
            client.roomCode, data.playerId, data.taskId
        );
        
        if (result.success) {
            this.broadcastToRoom(client.roomCode, JSON.stringify({
                type: 'task_completed',
                taskId: data.taskId,
                playerId: data.playerId
            }));
        }
    }
    
    handleKillPlayer(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.killPlayer(
            client.roomCode, data.killerId, data.playerId
        );
        
        if (result.success) {
            this.broadcastToRoom(client.roomCode, JSON.stringify({
                type: 'player_killed',
                playerId: data.playerId,
                killerId: data.killerId
            }));
        }
    }
    
    handleReportBody(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.reportBody(
            client.roomCode, data.playerId, data.bodyId
        );
        
        if (result.success) {
            this.broadcastToRoom(client.roomCode, JSON.stringify({
                type: 'body_reported',
                body: result.body,
                reportedBy: data.playerId
            }));
        }
    }
    
    handleCallMeeting(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.callMeeting(
            client.roomCode, data.playerId
        );
        
        if (result.success) {
            this.broadcastToRoom(client.roomCode, JSON.stringify({
                type: 'meeting_called',
                calledBy: data.playerId
            }));
        }
    }
    
    handleCastVote(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.castVote(
            client.roomCode, data.playerId, data.targetId
        );
        
        if (result.success) {
            this.broadcastToRoom(client.roomCode, JSON.stringify({
                type: 'vote_cast',
                playerId: data.playerId,
                targetId: data.targetId
            }));
        }
    }
    
    handleEndMeeting(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.endMeeting(client.roomCode);
        
        if (result.success) {
            this.broadcastToRoom(client.roomCode, JSON.stringify({
                type: 'meeting_ended'
            }));
        }
    }
    
    handleEndVoting(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        const result = this.roomManager.endVoting(client.roomCode);
        
        if (result.success) {
            const room = this.roomManager.getRoom(client.roomCode);
            if (room && room.state === 'ended') {
                this.broadcastToRoom(client.roomCode, JSON.stringify({
                    type: 'game_ended',
                    winner: room.winner,
                    gameState: this.roomManager.getGameStateForPlayer(client.roomCode, '')
                }));
            } else {
                this.broadcastToRoom(client.roomCode, JSON.stringify({
                    type: 'voting_ended',
                    ejectedPlayerId: result.ejectedPlayerId
                }));
            }
        }
    }
    
    handleChatMessage(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode) return;
        
        this.broadcastToRoom(client.roomCode, JSON.stringify({
            type: 'chat_message',
            playerId: data.playerId,
            message: data.message
        }));
    }
    
    handleSyncState(clientId, data) {
        const client = this.clients.get(clientId);
        if (!client || !client.roomCode || !client.playerId) return;
        
        const gameState = this.roomManager.getGameStateForPlayer(client.roomCode, client.playerId);
        
        if (gameState) {
            client.client.send(JSON.stringify({
                type: 'sync_state',
                state: gameState,
                playerId: client.playerId
            }));
        }
    }
    
    handleClose(clientId) {
        const client = this.clients.get(clientId);
        if (!client) return;
        
        if (client.roomCode && client.playerId) {
            const result = this.roomManager.leaveRoom(client.roomCode, client.playerId);
            
            if (result.success) {
                this.broadcastToRoom(client.roomCode, JSON.stringify({
                    type: 'player_left',
                    playerId: client.playerId,
                    playerName: result.playerName || 'Unknown'
                }));
            }
        }
        
        this.clients.delete(clientId);
        console.log(`Connection closed: ${clientId}`);
    }
    
    handleError(clientId, error) {
        console.error(`Error from ${clientId}:`, error);
        const client = this.clients.get(clientId);
        if (client) {
            client.client.close();
            this.clients.delete(clientId);
        }
    }
    
    broadcastToRoom(roomCode, message, excludeClientId = null) {
        this.clients.forEach((client, clientId) => {
            if (client.roomCode === roomCode && clientId !== excludeClientId) {
                try {
                    client.client.send(message);
                } catch (error) {
                    console.error(`Error sending to client ${clientId}:`, error);
                }
            }
        });
    }
}

// ===== Sunucuyu Başlat =====
console.log('Among Us Türkçe - WebSocket Sunucusu Başlatılıyor...');

const wsServer = new WebSocketServer();
const server = wsServer.start(PORT);

// Süreç sonlandırma
process.on('SIGINT', () => {
    console.log('\nSunucu kapatılıyor...');
    server.close(() => {
        console.log('Sunucu kapatıldı');
        process.exit(0);
    });
});

process.on('SIGTERM', () => {
    console.log('\nSunucu kapatılıyor...');
    server.close(() => {
        console.log('Sunucu kapatıldı');
        process.exit(0);
    });
});

console.log(`WebSocket sunucusu çalışıyor: ws://localhost:${PORT}`);
console.log('Ctrl+C ile sunucuyu durdurabilirsiniz');
