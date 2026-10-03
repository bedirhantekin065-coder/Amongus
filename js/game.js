// ===== OYUN MANTIĞI =====

class Game {
    constructor() {
        this.state = {
            roomCode: '',
            roomName: '',
            players: [],
            tasks: [],
            bodies: [],
            map: 'skeld',
            maxPlayers: 10,
            imposterCount: 1,
            state: Config.GAME_STATES.WAITING,
            timer: 0,
            meetingCalledBy: null,
            meetingBody: null,
            votes: {},
            gameStartTime: 0,
            lastUpdateTime: 0
        };
        this.hostId = null;
        this.myPlayerId = null;
        this.isAdmin = false;
        this.socket = null;
        this.canvasManager = null;
        this.gameStarted = false;
        this.gameEnded = false;
        this.winner = null;
        this.timers = {};
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        EventBus.on('socket_connected', () => this.handleSocketConnected());
        EventBus.on('socket_disconnected', () => this.handleSocketDisconnected());
        EventBus.on('socket_error', (error) => this.handleSocketError(error));
        EventBus.on('room_joined', (data) => this.handleRoomJoined(data));
        EventBus.on('room_left', () => this.handleRoomLeft());
        EventBus.on('room_updated', (data) => this.handleRoomUpdated(data));
        EventBus.on('player_joined', (data) => this.handlePlayerJoined(data));
        EventBus.on('player_left', (data) => this.handlePlayerLeft(data));
        EventBus.on('game_started', (data) => this.handleGameStarted(data));
        EventBus.on('game_ended', (data) => this.handleGameEnded(data));
        EventBus.on('game_state_updated', (data) => this.handleGameStateUpdated(data));
        EventBus.on('task_completed', (data) => this.handleTaskCompleted(data));
        EventBus.on('player_killed', (data) => this.handlePlayerKilled(data));
        EventBus.on('body_reported', (data) => this.handleBodyReported(data));
        EventBus.on('meeting_called', (data) => this.handleMeetingCalled(data));
        EventBus.on('meeting_ended', () => this.handleMeetingEnded());
        EventBus.on('vote_cast', (data) => this.handleVoteCast(data));
    }
    
    handleSocketConnected() {
        console.log('WebSocket connected');
        this.syncGameState();
    }
    handleSocketDisconnected() {
        console.log('WebSocket disconnected');
        showNotification('Connection lost, reconnecting...', 'error');
    }
    handleSocketError(error) {
        console.error('WebSocket error:', error);
        showNotification('Connection error: ' + error.message, 'error');
    }
    
    handleRoomJoined(data) {
        this.state = { ...this.state, ...data.room };
        this.myPlayerId = data.playerId;
        this.hostId = data.hostId;
        this.isAdmin = data.isAdmin || false;
        document.getElementById('adminBtn').style.display = this.isAdmin ? 'block' : 'none';
        showNotification(`Joined room: ${data.room.roomName}`, 'success');
        updateLobbyUI();
    }
    
    handleRoomLeft() {
        this.resetGameState();
        showNotification('You left the room', 'info');
        showMainMenu();
    }
    
    handleRoomUpdated(data) {
        this.state = { ...this.state, ...data };
        updateLobbyUI();
    }
    
    handlePlayerJoined(data) {
        this.state.players.push(data.player);
        updateLobbyUI();
        showNotification(`${data.player.name} joined`, 'info');
    }
    
    handlePlayerLeft(data) {
        this.state.players = this.state.players.filter(p => p.id !== data.playerId);
        updateLobbyUI();
        showNotification(`${data.playerName} left`, 'info');
    }
    
    handleGameStarted(data) {
        this.state = { ...this.state, ...data.gameState };
        this.gameStarted = true;
        this.state.state = Config.GAME_STATES.PLAYING;
        this.state.gameStartTime = Date.now();
        const myPlayer = this.getMyPlayer();
        if (myPlayer) myPlayer.role = data.myRole;
        startGameScreen();
        this.startGameTimer();
        showNotification('Game started!', 'success');
    }
    
    handleGameEnded(data) {
        this.state = { ...this.state, ...data.gameState };
        this.gameStarted = false;
        this.gameEnded = true;
        this.winner = data.winner;
        this.state.state = Config.GAME_STATES.ENDED;
        this.stopGameTimer();
        showGameResult(data.winner);
    }
    
    handleGameStateUpdated(data) {
        this.state = { ...this.state, ...data };
        if (this.state.state === Config.GAME_STATES.PLAYING) {
            updateGameUI();
        } else if (this.state.state === Config.GAME_STATES.MEETING) {
            showMeetingUI();
        } else if (this.state.state === Config.GAME_STATES.VOTING) {
            showVotingUI();
        }
    }
    
    handleTaskCompleted(data) {
        const taskIndex = this.state.tasks.findIndex(t => t.id === data.taskId);
        if (taskIndex !== -1) {
            this.state.tasks[taskIndex] = { ...this.state.tasks[taskIndex], completed: true, completedBy: data.playerId };
        }
        if (data.playerId === this.myPlayerId) showNotification('Task completed!', 'success');
        updateGameUI();
    }
    
    handlePlayerKilled(data) {
        const playerIndex = this.state.players.findIndex(p => p.id === data.playerId);
        if (playerIndex !== -1) {
            this.state.players[playerIndex] = { ...this.state.players[playerIndex], isDead: true, deathTime: Date.now(), killedBy: data.killerId };
        }
        const killedPlayer = this.state.players.find(p => p.id === data.playerId);
        if (killedPlayer) {
            this.state.bodies.push({ id: `body_${Date.now()}`, playerId: data.playerId, x: killedPlayer.x, y: killedPlayer.y, time: Date.now() });
        }
        updateGameUI();
    }
    
    handleBodyReported(data) {
        this.state.meetingBody = data.body;
        this.state.meetingCalledBy = data.reportedBy;
        this.state.state = Config.GAME_STATES.MEETING;
        showMeetingUI();
    }
    
    handleMeetingCalled(data) {
        this.state.meetingCalledBy = data.calledBy;
        this.state.meetingBody = null;
        this.state.state = Config.GAME_STATES.MEETING;
        showMeetingUI();
    }
    
    handleMeetingEnded() {
        this.state.state = Config.GAME_STATES.VOTING;
        this.state.votes = {};
        showVotingUI();
    }
    
    handleVoteCast(data) {
        this.state.votes[data.playerId] = data.targetId;
        updateVotingUI();
    }
    
    resetGameState() {
        this.state = {
            roomCode: '', roomName: '', players: [], tasks: [], bodies: [],
            map: 'skeld', maxPlayers: 10, imposterCount: 1,
            state: Config.GAME_STATES.WAITING, timer: 0,
            meetingCalledBy: null, meetingBody: null, votes: {}, gameStartTime: 0, lastUpdateTime: 0
        };
        this.gameStarted = false; this.gameEnded = false; this.winner = null;
        this.hostId = null; this.myPlayerId = null; this.clearAllTimers();
    }
    
    syncGameState() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'sync_state', playerId: this.myPlayerId }));
        }
    }
    
    startGameTimer() {
        this.clearTimer('gameTimer');
        this.timers.gameTimer = setInterval(() => {
            if (this.state.state === Config.GAME_STATES.PLAYING) {
                this.state.timer = Math.floor((Date.now() - this.state.gameStartTime) / 1000);
                updateGameTimer();
            }
        }, 1000);
    }
    
    stopGameTimer() { this.clearTimer('gameTimer'); }
    startMeetingTimer() {
        this.clearTimer('meetingTimer');
        this.timers.meetingTimer = setTimeout(() => {
            if (this.state.state === Config.GAME_STATES.MEETING) this.endMeeting();
        }, Config.MEETING_DURATION * 1000);
    }
    stopMeetingTimer() { this.clearTimer('meetingTimer'); }
    startVotingTimer() {
        this.clearTimer('votingTimer');
        this.timers.votingTimer = setTimeout(() => {
            if (this.state.state === Config.GAME_STATES.VOTING) this.endVoting();
        }, Config.VOTING_DURATION * 1000);
    }
    stopVotingTimer() { this.clearTimer('votingTimer'); }
    clearTimer(name) {
        if (this.timers[name]) { clearInterval(this.timers[name]); clearTimeout(this.timers[name]); delete this.timers[name]; }
    }
    clearAllTimers() { for (const name in this.timers) this.clearTimer(name); this.timers = {}; }
    
    getMyPlayer() { return this.state.players.find(p => p.id === this.myPlayerId); }
    getPlayerById(playerId) { return this.state.players.find(p => p.id === playerId); }
    getAlivePlayers() { return this.state.players.filter(p => !p.isDead); }
    getCrewmates() { return this.state.players.filter(p => p.role === Config.ROLES.CREWMATE && !p.isDead); }
    getImposters() { return this.state.players.filter(p => p.role === Config.ROLES.IMPOSTER && !p.isDead); }
    isHost() { return this.myPlayerId === this.hostId; }
    
    createRoom(roomData) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) { showNotification('Connection error', 'error'); return; }
        const username = getCookie('amongus_username') || generateUsername();
        const color = getCookie('amongus_color') || 'red';
        this.socket.send(JSON.stringify({ type: 'create_room', room: roomData, player: { name: username, color: color } }));
    }
    
    joinRoom(roomCode) {
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) { showNotification('Connection error', 'error'); return; }
        const username = getCookie('amongus_username') || generateUsername();
        const color = getCookie('amongus_color') || 'red';
        this.socket.send(JSON.stringify({ type: 'join_room', roomCode: roomCode.toUpperCase(), player: { name: username, color: color } }));
    }
    
    leaveRoom() {
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'leave_room', playerId: this.myPlayerId }));
        }
        this.resetGameState(); showMainMenu();
    }
    
    startGame() {
        if (!this.isHost()) { showNotification('Only host can start', 'error'); return; }
        if (this.state.players.length < 4) { showNotification('Need at least 4 players', 'error'); return; }
        if (!this.socket || this.socket.readyState !== WebSocket.OPEN) { showNotification('Connection error', 'error'); return; }
        this.socket.send(JSON.stringify({ type: 'start_game', roomCode: this.state.roomCode }));
    }
    
    movePlayer(direction) {
        if (!this.gameStarted || this.gameEnded) return;
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead) return;
        const map = Config.MAPS[this.state.map];
        const speed = myPlayer.role === Config.ROLES.IMPOSTER ? Config.GRAPHICS_CONFIG.IMPOSTER_SPEED : Config.GRAPHICS_CONFIG.CREWMATE_SPEED;
        const moveDistance = speed * 0.1;
        let newX = myPlayer.x; let newY = myPlayer.y;
        switch (direction) {
            case 'up': newY -= moveDistance; break; case 'down': newY += moveDistance; break;
            case 'left': newX -= moveDistance; break; case 'right': newX += moveDistance; break;
            case 'up-left': newX -= moveDistance * 0.7; newY -= moveDistance * 0.7; break;
            case 'up-right': newX += moveDistance * 0.7; newY -= moveDistance * 0.7; break;
            case 'down-left': newX -= moveDistance * 0.7; newY += moveDistance * 0.7; break;
            case 'down-right': newX += moveDistance * 0.7; newY += moveDistance * 0.7; break;
        }
        newX = Math.max(0, Math.min(map.width, newX)); newY = Math.max(0, Math.min(map.height, newY));
        myPlayer.x = newX; myPlayer.y = newY; myPlayer.direction = direction;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'player_move', playerId: this.myPlayerId, x: newX, y: newY, direction: direction }));
        }
        animateCrewmateWalk(myPlayer, 100);
    }
    
    doTask(taskId) {
        if (!this.gameStarted || this.gameEnded) return;
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead || myPlayer.role !== Config.ROLES.CREWMATE) return;
        const task = this.state.tasks.find(t => t.id === taskId && !t.completed);
        if (!task) return;
        const map = Config.MAPS[this.state.map];
        const taskDef = map.tasks.find(t => t.name === task.name);
        if (!taskDef) return;
        const taskPosition = taskDef.positions[0];
        const distance = getDistance(myPlayer.x, myPlayer.y, taskPosition.x, taskPosition.y);
        if (distance > 50) { showNotification('Get closer to do task', 'warning'); return; }
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'complete_task', playerId: this.myPlayerId, taskId: taskId }));
        }
        animateCrewmateTask(myPlayer, 1000);
    }
    
    killPlayer(targetId) {
        if (!this.gameStarted || this.gameEnded) return;
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead || myPlayer.role !== Config.ROLES.IMPOSTER) return;
        const target = this.getPlayerById(targetId);
        if (!target || target.isDead) return;
        const distance = getDistance(myPlayer.x, myPlayer.y, target.x, target.y);
        if (distance > 100) { showNotification('Get closer to kill', 'warning'); return; }
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'kill_player', killerId: this.myPlayerId, playerId: targetId }));
        }
        animateKill(myPlayer, 500);
    }
    
    reportBody(bodyId) {
        if (!this.gameStarted || this.gameEnded) return;
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead) return;
        const body = this.state.bodies.find(b => b.id === bodyId);
        if (!body) return;
        const distance = getDistance(myPlayer.x, myPlayer.y, body.x, body.y);
        if (distance > 50) { showNotification('Get closer to report', 'warning'); return; }
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'report_body', playerId: this.myPlayerId, bodyId: bodyId }));
        }
        animateCrewmateReport(myPlayer, 500);
    }
    
    callMeeting() {
        if (!this.gameStarted || this.gameEnded) return;
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead) return;
        if (myPlayer.lastMeetingCall && Date.now() - myPlayer.lastMeetingCall < Config.EMERGENCY_COOLDOWN * 1000) { return; }
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'call_meeting', playerId: this.myPlayerId }));
        }
        myPlayer.lastMeetingCall = Date.now();
    }
    
    castVote(targetId) {
        if (this.state.state !== Config.GAME_STATES.VOTING) return;
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead) return;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'cast_vote', playerId: this.myPlayerId, targetId: targetId }));
        }
    }
    
    skipVote() {
        if (this.state.state !== Config.GAME_STATES.VOTING) return;
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead) return;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'cast_vote', playerId: this.myPlayerId, targetId: null }));
        }
    }
    
    sendChatMessage(message) {
        if (!this.gameStarted || this.gameEnded) return;
        if (this.state.state !== Config.GAME_STATES.MEETING) return;
        const myPlayer = this.getMyPlayer();
        if (!myPlayer || myPlayer.isDead) return;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'chat_message', playerId: this.myPlayerId, message: message }));
        }
        addChatMessage(this.myPlayerId, message);
    }
    
    endMeeting() {
        if (!this.isHost() && this.state.meetingCalledBy !== this.myPlayerId) return;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'end_meeting', roomCode: this.state.roomCode }));
        }
    }
    
    endVoting() {
        if (!this.isHost()) return;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'end_voting', roomCode: this.state.roomCode }));
        }
    }
    
    spawnPlayer() {
        const myPlayer = this.getMyPlayer();
        if (!myPlayer) return;
        const spawnPoints = Config.MAPS[this.state.map].spawnPoints || [];
        if (spawnPoints.length === 0) return;
        const spawnPoint = getRandomElement(spawnPoints);
        myPlayer.x = spawnPoint.x; myPlayer.y = spawnPoint.y;
        if (this.socket && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify({ type: 'player_spawn', playerId: this.myPlayerId, x: spawnPoint.x, y: spawnPoint.y }));
        }
    }
}

const game = new Game();
