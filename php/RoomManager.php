<?php
// ===== ODA YÖNETİCİSİ =====

class RoomManager {
    private $rooms = [];
    private $maxRooms = 100;
    
    public function __construct($maxRooms = 100) {
        $this->maxRooms = $maxRooms;
    }
    
    // Oda kodunu olustur
    private function generateRoomCode() {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $chars[rand(0, strlen($chars) - 1)];
        }
        return $code;
    }
    
    // Oyuncu ID olustur
    private function generatePlayerId() {
        return 'player_' . time() . '_' . rand(0, 9999);
    }
    
    // Bot ID olustur
    private function generateBotId() {
        return 'bot_' . time() . '_' . rand(0, 9999);
    }
    
    // Gorev ID olustur
    private function generateTaskId() {
        return 'task_' . time() . '_' . rand(0, 9999);
    }
    
    // Harita verilerini al
    private function getMapData($mapName) {
        $maps = [
            'skeld' => [
                'name' => 'The Skeld',
                'width' => 2000,
                'height' => 1500,
                'spawnPoints' => [
                    ['x' => 200, 'y' => 200], ['x' => 500, 'y' => 200], ['x' => 800, 'y' => 200],
                    ['x' => 1200, 'y' => 200], ['x' => 1500, 'y' => 200],
                    ['x' => 200, 'y' => 500], ['x' => 500, 'y' => 500],
                    ['x' => 800, 'y' => 500], ['x' => 1200, 'y' => 500], ['x' => 1500, 'y' => 500]
                ],
                'tasks' => [
                    ['name' => 'Scan Card', 'count' => 2],
                    ['name' => 'Fix Wires', 'count' => 2],
                    ['name' => 'Fuel', 'count' => 1],
                    ['name' => 'Stop Sabotage', 'count' => 2],
                    ['name' => 'Download Data', 'count' => 1]
                ]
            ],
            'mira' => [
                'name' => 'Mira HQ',
                'width' => 1800,
                'height' => 1200,
                'spawnPoints' => [
                    ['x' => 200, 'y' => 200], ['x' => 400, 'y' => 200], ['x' => 600, 'y' => 200],
                    ['x' => 800, 'y' => 200], ['x' => 1000, 'y' => 200],
                    ['x' => 200, 'y' => 500], ['x' => 400, 'y' => 500],
                    ['x' => 600, 'y' => 500], ['x' => 800, 'y' => 500], ['x' => 1000, 'y' => 500]
                ],
                'tasks' => [
                    ['name' => 'Scan Card', 'count' => 2],
                    ['name' => 'Fix Wires', 'count' => 2],
                    ['name' => 'Fuel', 'count' => 1],
                    ['name' => 'Stop Sabotage', 'count' => 2],
                    ['name' => 'Download Data', 'count' => 1]
                ]
            ],
            'polus' => [
                'name' => 'Polus',
                'width' => 2200,
                'height' => 1600,
                'spawnPoints' => [
                    ['x' => 200, 'y' => 300], ['x' => 500, 'y' => 300], ['x' => 800, 'y' => 300],
                    ['x' => 1200, 'y' => 300], ['x' => 1500, 'y' => 300],
                    ['x' => 200, 'y' => 700], ['x' => 500, 'y' => 700],
                    ['x' => 800, 'y' => 700], ['x' => 1200, 'y' => 700], ['x' => 1500, 'y' => 700]
                ],
                'tasks' => [
                    ['name' => 'Scan Card', 'count' => 2],
                    ['name' => 'Fix Wires', 'count' => 2],
                    ['name' => 'Fuel', 'count' => 2],
                    ['name' => 'Stop Sabotage', 'count' => 2],
                    ['name' => 'Download Data', 'count' => 2]
                ]
            ]
        ];
        return $maps[$mapName] ?? $maps['skeld'];
    }
    
    // Oda olustur
    public function createRoom($roomData, $hostPlayer) {
        if (count($this->rooms) >= $this->maxRooms) {
            return ['success' => false, 'message' => 'Maksimum oda sayisina ulasilidi'];
        }
        
        $roomCode = $this->generateRoomCode();
        $hostId = $this->generatePlayerId();
        
        $room = [
            'roomCode' => $roomCode,
            'roomName' => $roomData['roomName'] ?? 'Yeni Oda',
            'map' => $roomData['map'] ?? 'skeld',
            'maxPlayers' => min($roomData['maxPlayers'] ?? 10, 10),
            'imposterCount' => min($roomData['imposterCount'] ?? 1, floor((min($roomData['maxPlayers'] ?? 10, 10)) / 2)),
            'players' => [],
            'tasks' => [],
            'bodies' => [],
            'state' => 'waiting',
            'hostId' => $hostId,
            'createdAt' => time(),
            'lastActivity' => time(),
            'addBots' => $roomData['addBots'] ?? false,
            'botCount' => min($roomData['botCount'] ?? 0, 8)
        ];
        
        $hostPlayer['id'] = $hostId;
        $hostPlayer['isHost'] = true;
        $hostPlayer['isDead'] = false;
        $hostPlayer['role'] = null;
        $hostPlayer['x'] = 0;
        $hostPlayer['y'] = 0;
        $hostPlayer['room'] = 'main';
        $hostPlayer['joinedAt'] = time();
        $hostPlayer['isBot'] = false;
        
        $room['players'][] = $hostPlayer;
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'room' => $room,
            'playerId' => $hostId,
            'hostId' => $hostId,
            'isAdmin' => false
        ];
    }
    
    // Odaya katil
    public function joinRoom($roomCode, $player) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        if (count($room['players']) >= $room['maxPlayers']) {
            return ['success' => false, 'message' => 'Oda dolu'];
        }
        if ($room['state'] === 'playing') {
            return ['success' => false, 'message' => 'Oyun zaten basladi'];
        }
        
        $playerId = $this->generatePlayerId();
        $player['id'] = $playerId;
        $player['isHost'] = false;
        $player['isDead'] = false;
        $player['role'] = null;
        $player['x'] = 0;
        $player['y'] = 0;
        $player['room'] = 'main';
        $player['joinedAt'] = time();
        $player['isBot'] = false;
        
        $room['players'][] = $player;
        $room['lastActivity'] = time();
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'room' => $room,
            'playerId' => $playerId,
            'hostId' => $room['hostId'],
            'isAdmin' => false
        ];
    }
    
    // Odadan ayril
    public function leaveRoom($roomCode, $playerId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadi'];
        }
        
        $isHost = $room['players'][$playerIndex]['isHost'] ?? false;
        $playerName = $room['players'][$playerIndex]['name'];
        
        array_splice($room['players'], $playerIndex, 1);
        
        if ($isHost && count($room['players']) > 0) {
            $room['players'][0]['isHost'] = true;
            $room['hostId'] = $room['players'][0]['id'];
        }
        
        if (count($room['players']) === 0) {
            $this->rooms->delete($roomCode);
            return ['success' => true, 'message' => 'Oda silindi'];
        }
        
        $room['lastActivity'] = time();
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'room' => $room,
            'playerName' => $playerName
        ];
    }
    
    // Oyunu baslat
    public function startGame($roomCode) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        if (count($room['players']) < 4) {
            return ['success' => false, 'message' => 'Minimum 4 oyuncu gerekiyor'];
        }
        if ($room['state'] === 'playing') {
            return ['success' => false, 'message' => 'Oyun zaten basladi'];
        }
        
        $this->assignRoles($room);
        $this->createTasks($room);
        
        if ($room['addBots'] && $room['botCount'] > 0) {
            $this->addBots($room, $room['botCount']);
        }
        
        $room['state'] = 'playing';
        $room['gameStartTime'] = time();
        $room['lastActivity'] = time();
        
        return ['success' => true, 'room' => $room, 'gameState' => $this->getGameStateForPlayers($room)];
    }
    
    // Roller ata
    private function assignRoles(&$room) {
        $players = $room['players'];
        $imposterCount = min($room['imposterCount'], floor(count($players) / 2));
        
        foreach ($players as &$player) {
            $player['role'] = 'crewmate';
        }
        
        $imposterIndices = [];
        while (count($imposterIndices) < $imposterCount) {
            $index = rand(0, count($players) - 1);
            if (!in_array($index, $imposterIndices)) {
                $imposterIndices[] = $index;
            }
        }
        
        foreach ($imposterIndices as $index) {
            $players[$index]['role'] = 'imposter';
        }
        
        $room['players'] = $players;
    }
    
    // Gorevleri olustur
    private function createTasks(&$room) {
        $map = $this->getMapData($room['map']);
        $tasks = [];
        
        foreach ($map['tasks'] as $taskTemplate) {
            for ($i = 0; $i < ($taskTemplate['count'] ?? 1); $i++) {
                $tasks[] = [
                    'id' => $this->generateTaskId(),
                    'name' => $taskTemplate['name'],
                    'completed' => false,
                    'completedBy' => null
                ];
            }
        }
        
        shuffle($tasks);
        $room['tasks'] = $tasks;
    }
    
    // Bot ekle
    private function addBots(&$room, $count) {
        $colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'brown', 'lime'];
        $map = $this->getMapData($room['map']);
        
        for ($i = 0; $i < $count; $i++) {
            $usedColors = array_map(function($player) { return $player['color']; }, $room['players']);
            $availableColors = array_diff($colors, $usedColors);
            $color = $availableColors[array_rand($availableColors)];
            
            $spawnPoint = $map['spawnPoints'][array_rand($map['spawnPoints'])];
            
            $bot = [
                'id' => $this->generateBotId(),
                'name' => 'Bot_' . ($i + 1),
                'color' => $color,
                'role' => null,
                'isHost' => false,
                'isDead' => false,
                'isBot' => true,
                'x' => $spawnPoint['x'],
                'y' => $spawnPoint['y'],
                'room' => 'main',
                'joinedAt' => time()
            ];
            
            $room['players'][] = $bot;
        }
        
        $this->assignRoles($room);
    }
    
    // Oyuncu hareketi
    public function movePlayer($roomCode, $playerId, $x, $y, $direction) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadi'];
        }
        
        $room['players'][$playerIndex]['x'] = (int)$x;
        $room['players'][$playerIndex]['y'] = (int)$y;
        $room['players'][$playerIndex]['direction'] = $direction;
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'player' => $room['players'][$playerIndex],
            'playerId' => $playerId
        ];
    }
    
    // Gorev tamamla
    public function completeTask($roomCode, $playerId, $taskId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadi'];
        }
        
        $player = $room['players'][$playerIndex];
        if ($player['role'] !== 'crewmate') {
            return ['success' => false, 'message' => 'Sadece crewmateler gorev yapabilir'];
        }
        
        if ($player['isDead']) {
            return ['success' => false, 'message' => 'Olu oyuncular gorev yapamaz'];
        }
        
        $taskIndex = $this->findTaskIndex($room, $taskId);
        if ($taskIndex === false) {
            return ['success' => false, 'message' => 'Gorev bulunamadi'];
        }
        
        if ($room['tasks'][$taskIndex]['completed']) {
            return ['success' => false, 'message' => 'Gorev zaten tamamlandi'];
        }
        
        $room['tasks'][$taskIndex]['completed'] = true;
        $room['tasks'][$taskIndex]['completedBy'] = $playerId;
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        $this->checkGameEnd($room);
        
        return [
            'success' => true,
            'taskId' => $taskId,
            'playerId' => $playerId
        ];
    }
    
    // Oyuncu oldur
    public function killPlayer($roomCode, $killerId, $playerId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $killerIndex = $this->findPlayerIndex($room, $killerId);
        if ($killerIndex === false) {
            return ['success' => false, 'message' => 'Katil bulunamadi'];
        }
        
        if ($room['players'][$killerIndex]['role'] !== 'imposter') {
            return ['success' => false, 'message' => 'Sadece Imposterler oldurme yapabilir'];
        }
        
        if ($room['players'][$killerIndex]['isDead']) {
            return ['success' => false, 'message' => 'Olu oyuncular oldurme yapamaz'];
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadi'];
        }
        
        if ($room['players'][$playerIndex]['isDead']) {
            return ['success' => false, 'message' => 'Oyuncu zaten olu'];
        }
        
        if ($room['players'][$playerIndex]['role'] === 'imposter') {
            return ['success' => false, 'message' => 'Imposterleri oldurme yapamazsin'];
        }
        
        $room['players'][$playerIndex]['isDead'] = true;
        $room['players'][$playerIndex]['deathTime'] = time();
        $room['players'][$playerIndex]['killedBy'] = $killerId;
        
        $room['bodies'][] = [
            'id' => 'body_' . time() . '_' . $playerId,
            'playerId' => $playerId,
            'x' => $room['players'][$playerIndex]['x'],
            'y' => $room['players'][$playerIndex]['y'],
            'time' => time()
        ];
        
        $room['lastActivity'] = time();
        $this->rooms[$roomCode] = $room;
        $this->checkGameEnd($room);
        
        return [
            'success' => true,
            'playerId' => $playerId,
            'killerId' => $killerId
        ];
    }
    
    // Ceset bildir
    public function reportBody($roomCode, $playerId, $bodyId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadi'];
        }
        
        $bodyIndex = $this->findBodyIndex($room, $bodyId);
        if ($bodyIndex === false) {
            return ['success' => false, 'message' => 'Ceset bulunamadi'];
        }
        
        $room['state'] = 'meeting';
        $room['meetingBody'] = $room['bodies'][$bodyIndex];
        $room['meetingCalledBy'] = $playerId;
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'body' => $room['bodies'][$bodyIndex],
            'reportedBy' => $playerId
        ];
    }
    
    // Toplanti cagir
    public function callMeeting($roomCode, $playerId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadi'];
        }
        
        $room['state'] = 'meeting';
        $room['meetingCalledBy'] = $playerId;
        $room['meetingBody'] = null;
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'calledBy' => $playerId
        ];
    }
    
    // Oy kullan
    public function castVote($roomCode, $playerId, $targetId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadi'];
        }
        
        $room['votes'][$playerId] = $targetId;
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'playerId' => $playerId,
            'targetId' => $targetId
        ];
    }
    
    // Toplanti sonlandir
    public function endMeeting($roomCode) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $room['state'] = 'voting';
        $room['votes'] = [];
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return ['success' => true];
    }
    
    // Oylamayi sonlandir
    public function endVoting($roomCode) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadi'];
        }
        
        $votes = $room['votes'];
        $voteCounts = [];
        
        foreach ($votes as $voter => $target) {
            if ($target !== null) {
                if (!isset($voteCounts[$target])) {
                    $voteCounts[$target] = 0;
                }
                $voteCounts[$target]++;
            }
        }
        
        $maxVotes = 0;
        $ejectedPlayerId = null;
        $tie = false;
        
        foreach ($voteCounts as $playerId => $count) {
            if ($count > $maxVotes) {
                $maxVotes = $count;
                $ejectedPlayerId = $playerId;
                $tie = false;
            } else if ($count === $maxVotes && $maxVotes > 0) {
                $tie = true;
            }
        }
        
        if ($ejectedPlayerId && !$tie) {
            $playerIndex = $this->findPlayerIndex($room, $ejectedPlayerId);
            if ($playerIndex !== false) {
                $room['players'][$playerIndex]['isDead'] = true;
                $room['players'][$playerIndex]['ejected'] = true;
                $room['players'][$playerIndex]['deathTime'] = time();
            }
        }
        
        $room['state'] = 'playing';
        $room['votes'] = [];
        $room['meetingCalledBy'] = null;
        $room['meetingBody'] = null;
        $room['bodies'] = [];
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        $this->checkGameEnd($room);
        
        return [
            'success' => true,
            'ejectedPlayerId' => $ejectedPlayerId
        ];
    }
    
    // Oyun sonu kontrolu
    private function checkGameEnd(&$room) {
        $crewmates = [];
        $imposters = [];
        
        foreach ($room['players'] as $player) {
            if (!$player['isDead']) {
                if ($player['role'] === 'crewmate') {
                    $crewmates[] = $player;
                } else {
                    $imposters[] = $player;
                }
            }
        }
        
        $allTasksCompleted = true;
        foreach ($room['tasks'] as $task) {
            if (!$task['completed']) {
                $allTasksCompleted = false;
                break;
            }
        }
        
        if ($allTasksCompleted && count($imposters) === 0) {
            $room['state'] = 'ended';
            $room['winner'] = 'crewmate';
            $room['gameEndTime'] = time();
            return;
        }
        
        if (count($crewmates) <= count($imposters)) {
            $room['state'] = 'ended';
            $room['winner'] = 'imposter';
            $room['gameEndTime'] = time();
            return;
        }
    }
    
    // Odayi al
    public function getRoom($roomCode) {
        return $this->rooms[$roomCode] ?? null;
    }
    
    // Tum odalari al
    public function getAllRooms() {
        return array_values($this->rooms);
    }
    
    // Odalari listele
    public function listOpenRooms() {
        $openRooms = [];
        
        foreach ($this->rooms as $room) {
            if ($room['state'] === 'waiting' && count($room['players']) < $room['maxPlayers']) {
                $openRooms[] = [
                    'roomCode' => $room['roomCode'],
                    'roomName' => $room['roomName'],
                    'playerCount' => count($room['players']),
                    'maxPlayers' => $room['maxPlayers'],
                    'map' => $room['map']
                ];
            }
        }
        
        return $openRooms;
    }
    
    // Odayi sil
    public function deleteRoom($roomCode) {
        if (isset($this->rooms[$roomCode])) {
            unset($this->rooms[$roomCode]);
            return true;
        }
        return false;
    }
    
    // Oyuncu konumunu guncelle
    public function updatePlayerPosition($roomCode, $playerId, $x, $y) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return false;
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return false;
        }
        
        $room['players'][$playerIndex]['x'] = (int)$x;
        $room['players'][$playerIndex]['y'] = (int)$y;
        
        $this->rooms[$roomCode] = $room;
        return true;
    }
    
    // Oyuncu durumu al
    public function getGameStateForPlayer($roomCode, $playerId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return null;
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return null;
        }
        
        $player = $room['players'][$playerIndex];
        
        $gameState = [
            'roomCode' => $room['roomCode'],
            'roomName' => $room['roomName'],
            'map' => $room['map'],
            'maxPlayers' => $room['maxPlayers'],
            'imposterCount' => $room['imposterCount'],
            'state' => $room['state'],
            'timer' => $room['gameStartTime'] ? (time() - $room['gameStartTime']) : 0,
            'players' => array_map(function($p) {
                return [
                    'id' => $p['id'],
                    'name' => $p['name'],
                    'color' => $p['color'],
                    'isDead' => $p['isDead'],
                    'isHost' => $p['isHost'],
                    'isBot' => $p['isBot'] ?? false,
                    'x' => $p['x'],
                    'y' => $p['y'],
                    'role' => $p['role']
                ];
            }, $room['players']),
            'tasks' => array_map(function($t) {
                return [
                    'id' => $t['id'],
                    'name' => $t['name'],
                    'completed' => $t['completed'],
                    'completedBy' => $t['completedBy']
                ];
            }, $room['tasks']),
            'bodies' => array_map(function($b) {
                return [
                    'id' => $b['id'],
                    'playerId' => $b['playerId'],
                    'x' => $b['x'],
                    'y' => $b['y']
                ];
            }, $room['bodies']),
            'myRole' => $player['role']
        ];
        
        if ($room['state'] === 'meeting') {
            $gameState['meetingCalledBy'] = $room['meetingCalledBy'];
            $gameState['meetingBody'] = $room['meetingBody'] ? [
                'id' => $room['meetingBody']['id'],
                'playerId' => $room['meetingBody']['playerId'],
                'x' => $room['meetingBody']['x'],
                'y' => $room['meetingBody']['y']
            ] : null;
        }
        
        if ($room['state'] === 'voting') {
            $gameState['votes'] = $room['votes'];
        }
        
        return $gameState;
    }
    
    // Yardimci fonksiyonlar
    private function findPlayerIndex($room, $playerId) {
        foreach ($room['players'] as $index => $player) {
            if ($player['id'] === $playerId) {
                return $index;
            }
        }
        return false;
    }
    
    private function findTaskIndex($room, $taskId) {
        foreach ($room['tasks'] as $index => $task) {
            if ($task['id'] === $taskId) {
                return $index;
            }
        }
        return false;
    }
    
    private function findBodyIndex($room, $bodyId) {
        foreach ($room['bodies'] as $index => $body) {
            if ($body['id'] === $bodyId) {
                return $index;
            }
        }
        return false;
    }
}

// Singleton
$roomManager = null;
function getRoomManager() {
    global $roomManager;
    if (!$roomManager) {
        $roomManager = new RoomManager();
    }
    return $roomManager;
}
