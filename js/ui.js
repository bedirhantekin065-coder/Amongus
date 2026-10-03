// ===== UI FONKSİYONLARI =====

// ===== Ana Menü =====
function showCreateRoom() {
    showModal('createRoomModal');
}

function showJoinRoom() {
    showModal('joinRoomModal');
    refreshRoomList();
}

function showSettings() {
    showModal('settingsModal');
    const username = getCookie('amongus_username') || 'Unknown';
    const color = getCookie('amongus_color') || 'red';
    document.getElementById('settingsUsername').textContent = username;
    document.getElementById('settingsColor').textContent = Config.COLORS[color]?.name || color;
}

function showAdminPanel() {
    showModal('adminPanel');
    showAdminTab('rooms');
}

// ===== Modal Yönetimi =====
function showModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.add('show');
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('show');
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => modal.classList.remove('show'));
}

// ===== Admin Panel =====
function showAdminTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    const activeBtn = document.querySelector(`.tab-btn:nth-child(${['rooms', 'bots', 'players', 'settings'].indexOf(tabName) + 1})`);
    if (activeBtn) activeBtn.classList.add('active');
    const activeContent = document.getElementById(`tab-${tabName}`);
    if (activeContent) activeContent.classList.add('active');
    
    switch (tabName) {
        case 'rooms': loadAdminRooms(); break;
        case 'bots': loadAdminBots(); break;
        case 'players': loadAdminPlayers(); break;
        case 'settings': loadAdminSettings(); break;
    }
}

function loadAdminRooms() {
    const tbody = document.getElementById('adminRoomsTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    const demoRooms = [
        { code: 'ABC123', name: 'Fun Room', playerCount: 8, status: 'Playing' },
        { code: 'DEF456', name: 'Serious Players', playerCount: 10, status: 'Waiting' },
        { code: 'GHI789', name: 'Beginners', playerCount: 4, status: 'Waiting' }
    ];
    demoRooms.forEach(room => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${room.code}</td><td>${room.name}</td><td>${room.playerCount}</td><td>${room.status}</td>
            <td><button class="btn btn-small">VIEW</button><button class="btn btn-small btn-danger">CLOSE</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function loadAdminBots() {
    const container = document.getElementById('botList');
    if (!container) return;
    container.innerHTML = '';
    const demoBots = [
        { id: 'bot_1', name: 'Smart Bot', type: 'Smart', status: 'Active' },
        { id: 'bot_2', name: 'Lazy Bot', type: 'Lazy', status: 'Active' }
    ];
    demoBots.forEach(bot => {
        const botCard = document.createElement('div');
        botCard.className = 'bot-card';
        botCard.innerHTML = `
            <h4>${bot.name}</h4><p>Type: ${bot.type}</p><p>Status: ${bot.status}</p>
            <button class="btn btn-small btn-danger">REMOVE</button>
        `;
        container.appendChild(botCard);
    });
}

function loadAdminPlayers() {
    const tbody = document.getElementById('adminPlayersTable');
    if (!tbody) return;
    tbody.innerHTML = '';
    const demoPlayers = [
        { name: 'Player1', color: 'Red', room: 'ABC123', ip: '192.168.1.1' },
        { name: 'Player2', color: 'Blue', room: 'DEF456', ip: '192.168.1.2' }
    ];
    demoPlayers.forEach(player => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${player.name}</td><td>${player.color}</td><td>${player.room}</td><td>${player.ip}</td>
            <td><button class="btn btn-small">VIEW</button><button class="btn btn-small btn-danger">KICK</button></td>
        `;
        tbody.appendChild(tr);
    });
}

function loadAdminSettings() {
    document.getElementById('maxRooms').value = Config.MAX_ROOMS;
    document.getElementById('maxBots').value = Config.MAX_BOTS;
    document.getElementById('allowBots').checked = true;
}

// ===== Lobby UI =====
function updateLobbyUI() {
    const state = game.state;
    document.getElementById('roomNameDisplay').textContent = state.roomName || 'New Room';
    document.getElementById('roomCodeDisplay').textContent = state.roomCode || '------';
    document.getElementById('mapDisplay').textContent = Config.MAPS[state.map]?.name || state.map;
    document.getElementById('imposterCountDisplay').textContent = state.imposterCount || 1;
    document.getElementById('maxPlayersDisplay').textContent = state.maxPlayers || 10;
    updatePlayerList();
    document.getElementById('playerCount').textContent = state.players.length;
    const startBtn = document.getElementById('startGameBtn');
    if (startBtn) startBtn.style.display = game.isHost() ? 'block' : 'none';
}

function updatePlayerList() {
    const container = document.getElementById('playersList');
    if (!container) return;
    container.innerHTML = '';
    game.state.players.forEach(player => {
        const playerItem = document.createElement('div');
        playerItem.className = 'player-item';
        const color = Config.COLORS[player.color]?.hex || '#ffffff';
        playerItem.innerHTML = `
            <div class="player-avatar bg-${player.color}" style="background-color: ${color}"></div>
            <span class="player-name">${truncateString(player.name, 10)}</span>
            ${player.isHost ? '<span>👑</span>' : ''}${player.isBot ? '<span>🤖</span>' : ''}
        `;
        container.appendChild(playerItem);
    });
}

function copyRoomCode() {
    const roomCode = game.state.roomCode;
    if (!roomCode) return;
    copyToClipboard(roomCode).then(() => showNotification('Room code copied!', 'success'))
        .catch(() => showNotification('Copy failed', 'error'));
}

// ===== Game UI =====
function startGameScreen() {
    closeAllModals();
    document.getElementById('gameScreen').classList.add('show');
    game.spawnPlayer();
    initGameUI();
}

function initGameUI() {
    const state = game.state;
    const myPlayer = game.getMyPlayer();
    document.getElementById('gameRoomCode').textContent = `Room: ${state.roomCode}`;
    document.getElementById('gameMapName').textContent = `Map: ${Config.MAPS[state.map]?.name || state.map}`;
    if (myPlayer) {
        document.getElementById('playerNameDisplay').textContent = myPlayer.name;
        const roleBadge = document.getElementById('playerRole');
        if (roleBadge) {
            roleBadge.textContent = myPlayer.role === Config.ROLES.IMPOSTER ? 'IMPOSTER' : 'CREWMATE';
            roleBadge.className = `role-badge role-${myPlayer.role}`;
        }
    }
    updateTaskList(); updatePlayerIcons(); game.startGameTimer();
}

function updateGameUI() {
    updateTaskList(); updatePlayerIcons(); updateGameTimer();
}

function updateTaskList() {
    const container = document.getElementById('tasksContainer');
    if (!container) return;
    container.innerHTML = '';
    const myPlayer = game.getMyPlayer();
    if (!myPlayer || myPlayer.role !== Config.ROLES.CREWMATE) {
        container.innerHTML = '<p style="color: var(--text-dim);">Imposters cannot do tasks</p>';
        return;
    }
    game.state.tasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `task-item ${task.completed ? 'completed' : ''}`;
        const taskDef = Config.MAPS[game.state.map]?.tasks.find(t => t.name === task.name);
        const icon = taskDef ? '📋' : '❓';
        taskItem.innerHTML = `<span class="task-icon">${icon}</span><span class="task-name">${task.name}</span><span class="task-progress">${task.completed ? 'Done' : 'Waiting'}</span>`;
        if (!task.completed) taskItem.onclick = () => game.doTask(task.id);
        container.appendChild(taskItem);
    });
}

function updatePlayerIcons() {
    const container = document.getElementById('playerIcons');
    if (!container) return;
    container.innerHTML = '';
    game.state.players.forEach(player => {
        const playerIcon = document.createElement('div');
        playerIcon.className = `player-icon ${player.isDead ? 'dead' : ''} ${player.color}`;
        playerIcon.style.backgroundColor = Config.COLORS[player.color]?.hex || '#ffffff';
        if (player.isDead) playerIcon.style.opacity = '0.3';
        container.appendChild(playerIcon);
    });
}

function updateGameTimer() {
    const timerElement = document.getElementById('gameTimer');
    if (timerElement) timerElement.textContent = formatTime(game.state.timer);
}

// ===== Meeting UI =====
function showMeetingUI() {
    const meetingUI = document.getElementById('meetingUI');
    if (meetingUI) meetingUI.style.display = 'block';
    const topicElement = document.getElementById('meetingTopic');
    if (topicElement) {
        if (game.state.meetingBody) {
            const reporter = game.getPlayerById(game.state.meetingCalledBy);
            const body = game.getPlayerById(game.state.meetingBody.playerId);
            topicElement.textContent = `${reporter?.name || 'Someone'} reported a body: ${body?.name || 'Unknown'}`;
        } else {
            const caller = game.getPlayerById(game.state.meetingCalledBy);
            topicElement.textContent = `${caller?.name || 'Someone'} called emergency meeting`;
        }
    }
    const chatMessages = document.getElementById('chatMessages');
    if (chatMessages) chatMessages.innerHTML = '';
    game.startMeetingTimer();
}

function showVotingUI() {
    const meetingUI = document.getElementById('meetingUI');
    const votingSection = document.getElementById('votingOptions');
    if (meetingUI) meetingUI.style.display = 'block';
    if (votingSection) {
        votingSection.innerHTML = '';
        game.getAlivePlayers().forEach(player => {
            if (player.id === game.myPlayerId) return;
            const voteOption = document.createElement('div');
            voteOption.className = 'vote-option';
            voteOption.dataset.playerId = player.id;
            const color = Config.COLORS[player.color]?.hex || '#ffffff';
            voteOption.innerHTML = `<div class="vote-avatar" style="background-color: ${color}"></div><span class="vote-name">${truncateString(player.name, 8)}</span>`;
            voteOption.onclick = () => {
                document.querySelectorAll('.vote-option').forEach(opt => opt.classList.remove('selected'));
                voteOption.classList.add('selected'); game.castVote(player.id);
            };
            votingSection.appendChild(voteOption);
        });
        const skipOption = document.createElement('div');
        skipOption.className = 'vote-option';
        skipOption.innerHTML = '<span class="vote-name">Skip Vote</span>';
        skipOption.onclick = () => {
            document.querySelectorAll('.vote-option').forEach(opt => opt.classList.remove('selected'));
            skipOption.classList.add('selected'); game.skipVote();
        };
        votingSection.appendChild(skipOption);
    }
    game.startVotingTimer();
}

function updateVotingUI() {
    const votingOptions = document.querySelectorAll('.vote-option');
    const votes = game.state.votes;
    votingOptions.forEach(option => {
        const playerId = option.dataset.playerId;
        if (playerId && votes[playerId]) {
            const voteCount = Object.values(votes).filter(v => v === playerId).length;
            const voteCountElement = document.createElement('span');
            voteCountElement.className = 'vote-count';
            voteCountElement.textContent = voteCount;
            option.appendChild(voteCountElement);
        }
    });
}

function addChatMessage(playerId, message) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;
    const player = game.getPlayerById(playerId);
    const playerName = player ? player.name : 'Unknown';
    const playerColor = player ? Config.COLORS[player.color]?.hex || '#ffffff' : '#ffffff';
    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';
    messageElement.innerHTML = `<span class="sender" style="color: ${playerColor}">${playerName}: </span><span class="message-text">${message}</span>`;
    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handleChatKey(event) {
    if (event.key === 'Enter') {
        const chatInput = document.getElementById('chatInput');
        if (chatInput) {
            const message = chatInput.value.trim();
            if (message) { game.sendChatMessage(message); chatInput.value = ''; }
        }
    }
}

// ===== Game Result =====
function showGameResult(winner) {
    const overlay = document.createElement('div');
    overlay.className = 'game-overlay';
    overlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.9);display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:1000';
    const resultBox = document.createElement('div');
    resultBox.style.cssText = 'background:var(--bg-darker);padding:40px;border-radius:20px;border:2px solid var(--accent);text-align:center';
    const title = document.createElement('h2');
    title.style.cssText = 'font-family:var(--font-title);font-size:2rem;color:' + (winner === Config.ROLES.CREWMATE ? 'var(--success)' : 'var(--danger)') + ';margin-bottom:20px';
    title.textContent = winner === Config.ROLES.CREWMATE ? 'CREWMATE' : 'IMPOSTER';
    const subtitle = document.createElement('h3');
    subtitle.style.cssText = 'font-family:var(--font-title);font-size:1.2rem;color:var(--text-light);margin-bottom:30px';
    subtitle.textContent = 'WINS!';
    const stats = document.createElement('div');
    stats.style.marginBottom = '30px';
    const crewmates = game.getCrewmates().length;
    const imposters = game.getImposters().length;
    stats.innerHTML = `<p style="font-family:var(--font-body);color:var(--text-light)">Crewmate: ${crewmates}</p><p style="font-family:var(--font-body);color:var(--text-light)">Imposter: ${imposters}</p>`;
    const backButton = document.createElement('button');
    backButton.className = 'btn btn-primary';
    backButton.textContent = 'BACK TO MENU';
    backButton.onclick = () => game.leaveRoom();
    resultBox.appendChild(title); resultBox.appendChild(subtitle); resultBox.appendChild(stats); resultBox.appendChild(backButton);
    overlay.appendChild(resultBox);
    const gameScreen = document.getElementById('gameScreen');
    if (gameScreen) gameScreen.appendChild(overlay);
}

// ===== Room List =====
function refreshRoomList() {
    const container = document.getElementById('openRoomsList');
    if (!container) return;
    container.innerHTML = '<p style="color: var(--text-dim);">Loading...</p>';
    setTimeout(() => {
        container.innerHTML = '';
        const demoRooms = [
            { code: 'ABC123', name: 'Fun Room', players: 8, maxPlayers: 10, map: 'skeld' },
            { code: 'DEF456', name: 'Serious', players: 4, maxPlayers: 10, map: 'mira' },
            { code: 'GHI789', name: 'Beginners', players: 2, maxPlayers: 8, map: 'polus' }
        ];
        demoRooms.forEach(room => {
            const roomItem = document.createElement('div');
            roomItem.style.cssText = 'padding:10px;margin:5px 0;background:var(--bg-dark);border-radius:8px;cursor:pointer;transition:all 0.3s ease';
            roomItem.innerHTML = `<strong>${room.name}</strong> (${room.code})<br><small style="color:var(--text-dim)">${room.players}/${room.maxPlayers} - ${Config.MAPS[room.map]?.name || room.map}</small>`;
            roomItem.onclick = () => { document.getElementById('roomCode').value = room.code; joinRoom(); };
            roomItem.onmouseenter = () => roomItem.style.background = 'var(--bg-darker)';
            roomItem.onmouseleave = () => roomItem.style.background = 'var(--bg-dark)';
            container.appendChild(roomItem);
        });
    }, 500);
}

// ===== Main Menu =====
function showMainMenu() {
    closeAllModals();
    const mainMenu = document.getElementById('mainMenu');
    const usernamePanel = document.getElementById('usernamePanel');
    if (getCookie('amongus_username')) {
        usernamePanel.style.display = 'none';
        mainMenu.style.display = 'flex';
    } else {
        usernamePanel.style.display = 'block';
        mainMenu.style.display = 'none';
    }
}

// Offline Mod Butonu
function addOfflineButton() {
    const mainMenu = document.getElementById('mainMenu');
    if (!mainMenu) return;
    
    const offlineBtn = document.createElement('button');
    offlineBtn.className = 'menu-btn';
    offlineBtn.innerHTML = '<span class="btn-icon">💾</span><span class="btn-label">OFFLINE MOD</span>';
    offlineBtn.onclick = showOfflineMenu;
    
    const menuButtons = mainMenu.querySelector('.menu-buttons');
    if (menuButtons) {
        menuButtons.appendChild(offlineBtn);
    }
}

function saveUsername() {
    const usernameInput = document.getElementById('usernameInput');
    const colorSelect = document.getElementById('colorSelect');
    const username = usernameInput.value.trim();
    const color = colorSelect.value;
    if (!isValidUsername(username)) { showNotification('Enter valid username (3-15 chars)', 'error'); return; }
    setCookie('amongus_username', username, 365);
    setCookie('amongus_color', color, 365);
    document.getElementById('usernamePanel').style.display = 'none';
    document.getElementById('mainMenu').style.display = 'flex';
    showNotification(`Welcome, ${username}!`, 'success');
}

function changeUsername() {
    closeModal('settingsModal');
    deleteCookie('amongus_username'); deleteCookie('amongus_color');
    document.getElementById('usernamePanel').style.display = 'block';
    document.getElementById('mainMenu').style.display = 'none';
}

// ===== Settings =====
function saveSettings() {
    const musicVolume = document.getElementById('musicVolume').value;
    const effectVolume = document.getElementById('effectVolume').value;
    const fullscreenToggle = document.getElementById('fullscreenToggle').checked;
    SoundConfig.volume.background = parseInt(musicVolume) / 100;
    SoundConfig.volume.effects = parseInt(effectVolume) / 100;
    if (fullscreenToggle) toggleFullscreen();
    showNotification('Settings saved', 'success');
    closeModal('settingsModal');
}

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => showNotification('Fullscreen failed', 'error'));
    } else { document.exitFullscreen(); }
}

// ===== Actions =====
function createRoom() {
    const roomName = document.getElementById('roomName').value.trim();
    const maxPlayers = document.getElementById('maxPlayers').value;
    const mapSelect = document.getElementById('mapSelect').value;
    const imposterCount = document.getElementById('imposterCount').value;
    const addBots = document.getElementById('addBots').checked;
    const botCount = document.getElementById('botCount').value;
    if (!roomName) { showNotification('Enter room name', 'error'); return; }
    if (roomName.length > 20) { showNotification('Room name too long', 'error'); return; }
    if (parseInt(maxPlayers) < 4 || parseInt(maxPlayers) > 10) { showNotification('Players must be 4-10', 'error'); return; }
    game.createRoom({ roomName, maxPlayers, map: mapSelect, imposterCount, addBots, botCount: addBots ? botCount : 0 });
    closeModal('createRoomModal'); showLoading('Creating room...');
}

function joinRoom() {
    const roomCode = document.getElementById('roomCode').value.trim().toUpperCase();
    if (!isValidRoomCode(roomCode)) { showNotification('Enter valid room code (6 chars)', 'error'); return; }
    game.joinRoom(roomCode); closeModal('joinRoomModal'); showLoading('Joining room...');
}

function leaveRoom() {
    if (confirm('Leave room?')) game.leaveRoom();
}

function showLoading(text) {
    const overlay = document.getElementById('loadingOverlay');
    const loadingText = document.getElementById('loadingText');
    if (overlay && loadingText) { loadingText.textContent = text; overlay.classList.add('show'); }
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('show');
}

function showNotification(message, type = 'info') {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    container.appendChild(notification);
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 5000);
}

// ===== Keyboard Controls =====
const keys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false, Space: false, Enter: false, Escape: false };

function initKeyboardControls() {
    document.addEventListener('keydown', (e) => {
        if (e.key in keys) { keys[e.key] = true; handleKeyPress(e); }
    });
    document.addEventListener('keyup', (e) => { if (e.key in keys) keys[e.key] = false; });
}

function handleKeyPress(e) {
    if (!game.gameStarted || game.gameEnded) { if (e.key === 'Escape') closeAllModals(); return; }
    if (game.state.state === Config.GAME_STATES.PLAYING) {
        if (e.key === 'ArrowUp') game.movePlayer('up');
        else if (e.key === 'ArrowDown') game.movePlayer('down');
        else if (e.key === 'ArrowLeft') game.movePlayer('left');
        else if (e.key === 'ArrowRight') game.movePlayer('right');
        else if (e.key === ' ') game.callMeeting();
        else if (e.key === 'e') handleInteraction();
        else if (e.key === 'q') handleKill();
    } else if (game.state.state === Config.GAME_STATES.MEETING) {
        const chatInput = document.getElementById('chatInput');
        if (chatInput && e.key === 'Enter') {
            const message = chatInput.value.trim();
            if (message) { game.sendChatMessage(message); chatInput.value = ''; }
        }
    }
}

function handleInteraction() {
    const myPlayer = game.getMyPlayer();
    if (!myPlayer || myPlayer.isDead) return;
    const map = Config.MAPS[game.state.map];
    for (const task of game.state.tasks) {
        if (task.completed) continue;
        const taskDef = map.tasks.find(t => t.name === task.name);
        if (!taskDef) continue;
        const taskPosition = taskDef.positions[0];
        const distance = getDistance(myPlayer.x, myPlayer.y, taskPosition.x, taskPosition.y);
        if (distance < 50 && myPlayer.role === Config.ROLES.CREWMATE) { game.doTask(task.id); return; }
    }
    for (const body of game.state.bodies) {
        const distance = getDistance(myPlayer.x, myPlayer.y, body.x, body.y);
        if (distance < 50) { game.reportBody(body.id); return; }
    }
}

function handleKill() {
    const myPlayer = game.getMyPlayer();
    if (!myPlayer || myPlayer.isDead || myPlayer.role !== Config.ROLES.IMPOSTER) return;
    game.getAlivePlayers().filter(p => p.id !== game.myPlayerId).forEach(player => {
        const distance = getDistance(myPlayer.x, myPlayer.y, player.x, player.y);
        if (distance < 100) { game.killPlayer(player.id); return; }
    });
}

// ===== Mouse Controls =====
function initMouseControls() {
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    canvas.addEventListener('click', (e) => {
        if (!game.gameStarted || game.gameEnded) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        const map = Config.MAPS[game.state.map];
        const scaleX = map.width / canvas.width; const scaleY = map.height / canvas.height;
        const worldX = x * scaleX + game.getMyPlayer().x - canvas.width / 2 * scaleX;
        const worldY = y * scaleY + game.getMyPlayer().y - canvas.height / 2 * scaleY;
        const myPlayer = game.getMyPlayer();
        if (myPlayer && !myPlayer.isDead) {
            const angle = getAngle(myPlayer.x, myPlayer.y, worldX, worldY);
            const direction = getDirection(myPlayer.x, myPlayer.y, worldX, worldY);
            game.movePlayer(direction);
        }
    });
}

// ===== Resize =====
function handleResize() {
    const canvas = document.getElementById('gameCanvas');
    if (canvas && game.canvasManager) {
        const container = canvas.parentElement;
        canvas.width = container.clientWidth; canvas.height = container.clientHeight;
        game.canvasManager.resize(canvas.width, canvas.height);
    }
}

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    if (canvas) { game.canvasManager = new CanvasAnimationManager(canvas); handleResize(); }
    initWebSocket(); initKeyboardControls(); initMouseControls();
    window.addEventListener('resize', handleResize); checkUsername();
});

window.addEventListener('beforeunload', () => {
    if (game.socket) game.socket.close();
    game.leaveRoom();
});

// ===== Bot Controls =====
function addBotsToRoom() {
    const addBots = document.getElementById('addBots').checked;
    const botCountContainer = document.getElementById('botCountContainer');
    if (botCountContainer) botCountContainer.style.display = addBots ? 'block' : 'none';
}

// ===== Demo =====
function startDemoGame() {
    game.state = {
        roomCode: 'DEMO12', roomName: 'Demo Room',
        players: [
            { id: 'player_1', name: 'You', color: 'red', role: Config.ROLES.CREWMATE, isDead: false, x: 100, y: 100, isHost: true, isBot: false },
            { id: 'player_2', name: 'Player2', color: 'blue', role: Config.ROLES.CREWMATE, isDead: false, x: 200, y: 200, isHost: false, isBot: false },
            { id: 'player_3', name: 'Player3', color: 'green', role: Config.ROLES.CREWMATE, isDead: false, x: 300, y: 300, isHost: false, isBot: false },
            { id: 'player_4', name: 'Imposter', color: 'black', role: Config.ROLES.IMPOSTER, isDead: false, x: 400, y: 400, isHost: false, isBot: false }
        ],
        tasks: [
            { id: 'task_1', name: 'Scan Card', completed: false, completedBy: null },
            { id: 'task_2', name: 'Fix Wires', completed: false, completedBy: null },
            { id: 'task_3', name: 'Fuel', completed: false, completedBy: null }
        ],
        bodies: [], map: 'skeld', maxPlayers: 10, imposterCount: 1,
        state: Config.GAME_STATES.PLAYING, timer: 0, meetingCalledBy: null, meetingBody: null, votes: {}, gameStartTime: Date.now(), lastUpdateTime: Date.now()
    };
    game.myPlayerId = 'player_1'; game.hostId = 'player_1';
    game.gameStarted = true; game.gameEnded = false;
    startGameScreen(); game.startGameTimer();
}
