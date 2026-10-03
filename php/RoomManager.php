<?php
// ===== ODA YÖNETİCİSİ =====

class RoomManager {
    private $rooms = [];
    private $maxRooms = 100;
    
    public function __construct($maxRooms = 100) {
        $this->maxRooms = $maxRooms;
    }
    
    // Oda oluştur
    public function createRoom($roomData, $hostPlayer) {
        // Maksimum oda sayısını kontrol et
        if (count($this->rooms) >= $this->maxRooms) {
            return ['success' => false, 'message' => 'Maksimum oda sayısına ulaşıldı'];
        }
        
        // Oda kodunu oluştur
        $roomCode = $this->generateRoomCode();
        
        // Yeni oda nesnesini oluştur
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
            'hostId' => $hostPlayer['id'] ?? null,
            'createdAt' => time(),
            'lastActivity' => time(),
            'addBots' => $roomData['addBots'] ?? false,
            'botCount' => min($roomData['botCount'] ?? 0, 8)
        ];
        
        // Host oyuncusunu ekle
        $hostPlayer['id'] = $this->generatePlayerId();
        $hostPlayer['isHost'] = true;
        $hostPlayer['isDead'] = false;
        $hostPlayer['role'] = null;
        $hostPlayer['x'] = 0;
        $hostPlayer['y'] = 0;
        $hostPlayer['room'] = 'main';
        $hostPlayer['joinedAt'] = time();
        
        $room['players'][] = $hostPlayer;
        
        // Odayı kaydet
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'room' => $room,
            'playerId' => $hostPlayer['id'],
            'hostId' => $hostPlayer['id'],
            'isAdmin' => false
        ];
    }
    
    // Odaya katıl
    public function joinRoom($roomCode, $player) {
        // Odayı bul
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Oda dolu mu?
        if (count($room['players']) >= $room['maxPlayers']) {
            return ['success' => false, 'message' => 'Oda dolu'];
        }
        
        // Oyunu başladı mı?
        if ($room['state'] === 'playing') {
            return ['success' => false, 'message' => 'Oyun zaten başladı'];
        }
        
        // Oyuncu ID'si oluştur
        $player['id'] = $this->generatePlayerId();
        $player['isHost'] = false;
        $player['isDead'] = false;
        $player['role'] = null;
        $player['x'] = 0;
        $player['y'] = 0;
        $player['room'] = 'main';
        $player['joinedAt'] = time();
        
        // Oyuncuyu odaya ekle
        $room['players'][] = $player;
        $room['lastActivity'] = time();
        
        // Odayı güncelle
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'room' => $room,
            'playerId' => $player['id'],
            'hostId' => $room['hostId'],
            'isAdmin' => false
        ];
    }
    
    // Odadan ayrıl
    public function leaveRoom($roomCode, $playerId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Oyuncuyu bul ve kaldır
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadı'];
        }
        
        // Oyuncu host mu?
        $isHost = $room['players'][$playerIndex]['isHost'] ?? false;
        
        // Oyuncuyu kaldır
        array_splice($room['players'], $playerIndex, 1);
        
        // Eğer host ayrıldıysa, yeni host atama
        if ($isHost && count($room['players']) > 0) {
            $room['players'][0]['isHost'] = true;
            $room['hostId'] = $room['players'][0]['id'];
        }
        
        // Oda boşaldıysa, odayı sil
        if (count($room['players']) === 0) {
            $this->deleteRoom($roomCode);
            return ['success' => true, 'message' => 'Oda silindi'];
        }
        
        $room['lastActivity'] = time();
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'room' => $room,
            'playerName' => $room['players'][$playerIndex]['name'] ?? 'Bilinmiyor'
        ];
    }
    
    // Oyunu başlat
    public function startGame($roomCode) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Minimum oyuncu sayısını kontrol et
        if (count($room['players']) < 4) {
            return ['success' => false, 'message' => 'Minimum 4 oyuncu gerekiyor'];
        }
        
        // Oyunu zaten başladı mı?
        if ($room['state'] === 'playing') {
            return ['success' => false, 'message' => 'Oyun zaten başladı'];
        }
        
        // Roller ata
        $this->assignRoles($room);
        
        // Görevleri oluştur
        $this->createTasks($room);
        
        // Botları ekle (eğer seçildiyse)
        if ($room['addBots'] && $room['botCount'] > 0) {
            $this->addBots($room, $room['botCount']);
        }
        
        // Oyun durumunu güncelle
        $room['state'] = 'playing';
        $room['gameStartTime'] = time();
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'room' => $room,
            'gameState' => $this->getGameStateForPlayers($room)
        ];
    }
    
    // Roller ata
    private function assignRoles(&$room) {
        $players = $room['players'];
        $imposterCount = min($room['imposterCount'], floor(count($players) / 2));
        
        // Tüm oyuncuları crewmate yap
        foreach ($players as &$player) {
            $player['role'] = 'crewmate';
        }
        
        // Imposter'ları rastgele seç
        $imposterIndices = array_rand($players, $imposterCount);
        if (is_array($imposterIndices)) {
            foreach ($imposterIndices as $index) {
                $players[$index]['role'] = 'imposter';
            }
        } else {
            $players[$imposterIndices]['role'] = 'imposter';
        }
        
        $room['players'] = $players;
    }
    
    // Görevleri oluştur
    private function createTasks(&$room) {
        $map = $this->getMapData($room['map']);
        $tasks = [];
        
        if (isset($map['tasks'])) {
            foreach ($map['tasks'] as $taskTemplate) {
                for ($i = 0; $i < $taskTemplate['count'] ?? 1; $i++) {
                    $tasks[] = [
                        'id' => $this->generateTaskId(),
                        'name' => $taskTemplate['name'],
                        'completed' => false,
                        'completedBy' => null
                    ];
                }
            }
        }
        
        // Karıştır
        shuffle($tasks);
        
        $room['tasks'] = $tasks;
    }
    
    // Bot ekle
    private function addBots(&$room, $count) {
        $colors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'cyan', 'brown', 'lime'];
        $map = $this->getMapData($room['map']);
        
        for ($i = 0; $i < $count; $i++) {
            // Kullanılmayan renkleri bul
            $usedColors = array_map(function($player) { return $player['color']; }, $room['players']);
            $availableColors = array_diff($colors, $usedColors);
            
            if (empty($availableColors)) {
                $availableColors = $colors;
            }
            
            $color = $availableColors[array_rand($availableColors)];
            
            $bot = [
                'id' => $this->generateBotId(),
                'name' => 'Bot_' . ($i + 1),
                'color' => $color,
                'role' => null, // Roller oyunu başlatırken atanacak
                'isHost' => false,
                'isDead' => false,
                'isBot' => true,
                'x' => $map['spawnPoints'][array_rand($map['spawnPoints'])]['x'] ?? 100,
                'y' => $map['spawnPoints'][array_rand($map['spawnPoints'])]['y'] ?? 100,
                'room' => 'main',
                'joinedAt' => time()
            ];
            
            $room['players'][] = $bot;
        }
        
        // Roller yeniden ata (botlar dahil)
        $this->assignRoles($room);
    }
    
    // Oyuncu hareketi
    public function movePlayer($roomCode, $playerId, $x, $y, $direction) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadı'];
        }
        
        // Konumu güncelle
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
    
    // Görev tamamla
    public function completeTask($roomCode, $playerId, $taskId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Oyuncu crewmate mi?
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadı'];
        }
        
        $player = $room['players'][$playerIndex];
        if ($player['role'] !== 'crewmate') {
            return ['success' => false, 'message' => 'Sadece crewmate'lar görev yapabilir'];
        }
        
        if ($player['isDead']) {
            return ['success' => false, 'message' => 'Ölü oyuncular görev yapamaz'];
        }
        
        // Görevi bul
        $taskIndex = $this->findTaskIndex($room, $taskId);
        if ($taskIndex === false) {
            return ['success' => false, 'message' => 'Görev bulunamadı'];
        }
        
        // Görev zaten tamamlandı mı?
        if ($room['tasks'][$taskIndex]['completed']) {
            return ['success' => false, 'message' => 'Görev zaten tamamlandı'];
        }
        
        // Görevi tamamla
        $room['tasks'][$taskIndex]['completed'] = true;
        $room['tasks'][$taskIndex]['completedBy'] = $playerId;
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'taskId' => $taskId,
            'playerId' => $playerId
        ];
    }
    
    // Oyuncu öldür
    public function killPlayer($roomCode, $killerId, $playerId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Katil imposter mi?
        $killerIndex = $this->findPlayerIndex($room, $killerId);
        if ($killerIndex === false) {
            return ['success' => false, 'message' => 'Katil bulunamadı'];
        }
        
        if ($room['players'][$killerIndex]['role'] !== 'imposter') {
            return ['success' => false, 'message' => 'Sadece imposter'lar öldürme yapabilir'];
        }
        
        if ($room['players'][$killerIndex]['isDead']) {
            return ['success' => false, 'message' => 'Ölü oyuncular öldürme yapamaz'];
        }
        
        // Kurbanı bul
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadı'];
        }
        
        // Kurban zaten ölü mü?
        if ($room['players'][$playerIndex]['isDead']) {
            return ['success' => false, 'message' => 'Oyuncu zaten ölü'];
        }
        
        // Kurban imposter mı? (kendini öldürmeye çalışıyor mu?)
        if ($room['players'][$playerIndex]['role'] === 'imposter') {
            return ['success' => false, 'message' => 'Imposter'ları öldürme yapamazsın'];
        }
        
        // Oyuncuyu öldür
        $room['players'][$playerIndex]['isDead'] = true;
        $room['players'][$playerIndex]['deathTime'] = time();
        $room['players'][$playerIndex]['killedBy'] = $killerId;
        
        // Ceset ekle
        $body = [
            'id' => 'body_' . time() . '_' . $playerId,
            'playerId' => $playerId,
            'x' => $room['players'][$playerIndex]['x'],
            'y' => $room['players'][$playerIndex]['y'],
            'time' => time()
        ];
        
        $room['bodies'][] = $body;
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        // Oyun sonu kontrolü
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
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Bildiren oyuncuyu bul
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadı'];
        }
        
        // Ceseti bul
        $bodyIndex = $this->findBodyIndex($room, $bodyId);
        if ($bodyIndex === false) {
            return ['success' => false, 'message' => 'Ceset bulunamadı'];
        }
        
        // Toplantı durumunu ayarla
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
    
    // Toplantı çağır
    public function callMeeting($roomCode, $playerId) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Toplantıyı çağırın oyuncuyu bul
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadı'];
        }
        
        // Toplantı durumunu ayarla
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
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Oyunu kullanın oyuncuyu bul
        $playerIndex = $this->findPlayerIndex($room, $playerId);
        if ($playerIndex === false) {
            return ['success' => false, 'message' => 'Oyuncu bulunamadı'];
        }
        
        // Oyu kaydet
        $room['votes'][$playerId] = $targetId;
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return [
            'success' => true,
            'playerId' => $playerId,
            'targetId' => $targetId
        ];
    }
    
    // Toplantıyı sonlandır
    public function endMeeting($roomCode) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Durumu oylamaya geçir
        $room['state'] = 'voting';
        $room['votes'] = [];
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        return ['success' => true];
    }
    
    // Oylamayı sonlandır
    public function endVoting($roomCode) {
        $room = $this->getRoom($roomCode);
        if (!$room) {
            return ['success' => false, 'message' => 'Oda bulunamadı'];
        }
        
        // Oyları say
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
        
        // En fazla oy alan oyuncuyu bul
        $maxVotes = 0;
        $ejectedPlayerId = null;
        
        foreach ($voteCounts as $playerId => $count) {
            if ($count > $maxVotes) {
                $maxVotes = $count;
                $ejectedPlayerId = $playerId;
            }
        }
        
        // Eşitlik varsa kimse atılmaz
        $tie = false;
        foreach ($voteCounts as $count) {
            if ($count === $maxVotes && $maxVotes > 0) {
                if ($ejectedPlayerId !== null && $count === $maxVotes) {
                    $tie = true;
                    break;
                }
            }
        }
        
        // Oyuncu atma
        if ($ejectedPlayerId && !$tie) {
            $playerIndex = $this->findPlayerIndex($room, $ejectedPlayerId);
            if ($playerIndex !== false) {
                $room['players'][$playerIndex]['isDead'] = true;
                $room['players'][$playerIndex]['ejected'] = true;
                $room['players'][$playerIndex]['deathTime'] = time();
            }
        }
        
        // Durumu oynuyora geçir
        $room['state'] = 'playing';
        $room['votes'] = [];
        $room['meetingCalledBy'] = null;
        $room['meetingBody'] = null;
        $room['bodies'] = [];
        $room['lastActivity'] = time();
        
        $this->rooms[$roomCode] = $room;
        
        // Oyun sonu kontrolü
        $this->checkGameEnd($room);
        
        return [
            'success' => true,
            'ejectedPlayerId' => $ejectedPlayerId
        ];
    }
    
    // Oyun sonu kontrolü
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
        
        // Crewmate kazanma koşulu: tüm görevler tamamlandı
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
        
        // Imposter kazanma koşulu: crewmate sayısı imposter sayısına eşit veya az
        if (count($crewmates) <= count($imposters)) {
            $room['state'] = 'ended';
            $room['winner'] = 'imposter';
            $room['gameEndTime'] = time();
            return;
        }
    }
    
    // Odayı al
    public function getRoom($roomCode) {
        return $this->rooms[$roomCode] ?? null;
    }
    
    // Tüm odaları al
    public function getAllRooms() {
        return array_values($this->rooms);
    }
    
    // Odaları listele (sadece açık odalar)
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
    
    // Odayı sil
    public function deleteRoom($roomCode) {
        if (isset($this->rooms[$roomCode])) {
            unset($this->rooms[$roomCode]);
            return true;
        }
        return false;
    }
    
    // Oyuncu konumunu güncelle
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
        
        // Oyuncuya özel durum
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
    
    // ===== Yardımcı Fonksiyonlar =====
    
    // Oda kodu oluştur
    private function generateRoomCode() {
        $chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        $code = '';
        for ($i = 0; $i < 6; $i++) {
            $code .= $chars[rand(0, strlen($chars) - 1)];
        }
        return $code;
    }
    
    // Oyuncu ID'si oluştur
    private function generatePlayerId() {
        return 'player_' . time() . '_' . rand(0, 9999);
    }
    
    // Bot ID'si oluştur
    private function generateBotId() {
        return 'bot_' . time() . '_' . rand(0, 9999);
    }
    
    // Görev ID'si oluştur
    private function generateTaskId() {
        return 'task_' . time() . '_' . rand(0, 9999);
    }
    
    // Oyuncuyu bul
    private function findPlayerIndex($room, $playerId) {
        foreach ($room['players'] as $index => $player) {
            if ($player['id'] === $playerId) {
                return $index;
            }
        }
        return false;
    }
    
    // Görevi bul
    private function findTaskIndex($room, $taskId) {
        foreach ($room['tasks'] as $index => $task) {
            if ($task['id'] === $taskId) {
                return $index;
            }
        }
        return false;
    }
    
    // Ceseti bul
    private function findBodyIndex($room, $bodyId) {
        foreach ($room['bodies'] as $index => $body) {
            if ($body['id'] === $bodyId) {
                return $index;
            }
        }
        return false;
    }
    
    // Harita verilerini al
    private function getMapData($mapName) {
        $maps = [
            'skeld' => [
                'name' => 'The Skeld',
                'width' => 2000,
                'height' => 1500,
                'spawnPoints' => [
                    ['x' => 200, 'y' => 200],
                    ['x' => 500, 'y' => 200],
                    ['x' => 800, 'y' => 200],
                    ['x' => 1200, 'y' => 200],
                    ['x' => 1500, 'y' => 200],
                    ['x' => 200, 'y' => 500],
                    ['x' => 500, 'y' => 500],
                    ['x' => 800, 'y' => 500],
                    ['x' => 1200, 'y' => 500],
                    ['x' => 1500, 'y' => 500]
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
                    ['x' => 200, 'y' => 200],
                    ['x' => 400, 'y' => 200],
                    ['x' => 600, 'y' => 200],
                    ['x' => 800, 'y' => 200],
                    ['x' => 1000, 'y' => 200],
                    ['x' => 200, 'y' => 500],
                    ['x' => 400, 'y' => 500],
                    ['x' => 600, 'y' => 500],
                    ['x' => 800, 'y' => 500],
                    ['x' => 1000, 'y' => 500]
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
                    ['x' => 200, 'y' => 300],
                    ['x' => 500, 'y' => 300],
                    ['x' => 800, 'y' => 300],
                    ['x' => 1200, 'y' => 300],
                    ['x' => 1500, 'y' => 300],
                    ['x' => 200, 'y' => 700],
                    ['x' => 500, 'y' => 700],
                    ['x' => 800, 'y' => 700],
                    ['x' => 1200, 'y' => 700],
                    ['x' => 1500, 'y' => 700]
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
}

// Singleton instance
$roomManager = null;
function getRoomManager() {
    global $roomManager;
    if (!$roomManager) {
        $roomManager = new RoomManager();
    }
    return $roomManager;
}

// Oturum yönetimi
session_start();

// CORS başlıkları
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// İstek türüne göre işle
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

$roomManager = getRoomManager();

switch ($method) {
    case 'GET':
        handleGetRequest($roomManager, $action);
        break;
    case 'POST':
        handlePostRequest($roomManager, $action);
        break;
    case 'OPTIONS':
        // CORS preflight
        header("HTTP/1.1 200 OK");
        exit;
    default:
        echo json_encode(['success' => false, 'message' => 'Geçersiz istek']);
        break;
}

function handleGetRequest($roomManager, $action) {
    switch ($action) {
        case 'list_rooms':
            $rooms = $roomManager->listOpenRooms();
            echo json_encode(['success' => true, 'rooms' => $rooms]);
            break;
        case 'get_room':
            $roomCode = $_GET['roomCode'] ?? '';
            $room = $roomManager->getRoom($roomCode);
            if ($room) {
                // Oyuncu ID'sini al
                $playerId = $_GET['playerId'] ?? '';
                $gameState = $roomManager->getGameStateForPlayer($roomCode, $playerId);
                echo json_encode(['success' => true, 'room' => $room, 'gameState' => $gameState]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Oda bulunamadı']);
            }
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Geçersiz eylem']);
            break;
    }
}

function handlePostRequest($roomManager, $action) {
    $data = json_decode(file_get_contents('php://input'), true);
    
    switch ($action) {
        case 'create_room':
            $player = ['name' => $data['player']['name'] ?? 'Unknown', 'color' => $data['player']['color'] ?? 'red'];
            $result = $roomManager->createRoom($data['room'], $player);
            echo json_encode($result);
            break;
        case 'join_room':
            $player = ['name' => $data['player']['name'] ?? 'Unknown', 'color' => $data['player']['color'] ?? 'red'];
            $result = $roomManager->joinRoom($data['roomCode'], $player);
            echo json_encode($result);
            break;
        case 'leave_room':
            $result = $roomManager->leaveRoom($data['roomCode'], $data['playerId']);
            echo json_encode($result);
            break;
        case 'start_game':
            $result = $roomManager->startGame($data['roomCode']);
            echo json_encode($result);
            break;
        case 'player_move':
            $result = $roomManager->movePlayer($data['roomCode'], $data['playerId'], $data['x'], $data['y'], $data['direction']);
            echo json_encode($result);
            break;
        case 'complete_task':
            $result = $roomManager->completeTask($data['roomCode'], $data['playerId'], $data['taskId']);
            echo json_encode($result);
            break;
        case 'kill_player':
            $result = $roomManager->killPlayer($data['roomCode'], $data['killerId'], $data['playerId']);
            echo json_encode($result);
            break;
        case 'report_body':
            $result = $roomManager->reportBody($data['roomCode'], $data['playerId'], $data['bodyId']);
            echo json_encode($result);
            break;
        case 'call_meeting':
            $result = $roomManager->callMeeting($data['roomCode'], $data['playerId']);
            echo json_encode($result);
            break;
        case 'cast_vote':
            $result = $roomManager->castVote($data['roomCode'], $data['playerId'], $data['targetId']);
            echo json_encode($result);
            break;
        case 'end_meeting':
            $result = $roomManager->endMeeting($data['roomCode']);
            echo json_encode($result);
            break;
        case 'end_voting':
            $result = $roomManager->endVoting($data['roomCode']);
            echo json_encode($result);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Geçersiz eylem']);
            break;
    }
}

// WebSocket sunucusu için temel sınıf
class WebSocketServer {
    private $roomManager;
    private $clients = [];
    
    public function __construct() {
        $this->roomManager = getRoomManager();
    }
    
    public function onOpen($client) {
        $clientId = spl_object_hash($client);
        $this->clients[$clientId] = ['client' => $client, 'roomCode' => null, 'playerId' => null];
        echo "New connection: $clientId\n";
    }
    
    public function onMessage($client, $message) {
        $clientId = spl_object_hash($client);
        
        try {
            $data = json_decode($message, true);
            if (!$data) {
                $client->send(json_encode(['type' => 'error', 'message' => 'Geçersiz mesaj formatı']));
                return;
            }
            
            $this->handleMessage($client, $clientId, $data);
        } catch (Exception $e) {
            $client->send(json_encode(['type' => 'error', 'message' => 'Mesaj işlenemedi']));
        }
    }
    
    public function onClose($client) {
        $clientId = spl_object_hash($client);
        if (isset($this->clients[$clientId])) {
            $roomCode = $this->clients[$clientId]['roomCode'];
            $playerId = $this->clients[$clientId]['playerId'];
            
            if ($roomCode && $playerId) {
                $result = $this->roomManager->leaveRoom($roomCode, $playerId);
                if ($result['success']) {
                    $this->broadcastToRoom($roomCode, json_encode([
                        'type' => 'player_left',
                        'playerId' => $playerId,
                        'playerName' => $result['playerName'] ?? 'Unknown'
                    ]));
                }
            }
            
            unset($this->clients[$clientId]);
        }
        echo "Connection closed: $clientId\n";
    }
    
    public function onError($client, $e) {
        echo "Error: {$e->getMessage()}\n";
        $client->close();
    }
    
    private function handleMessage($client, $clientId, $data) {
        switch ($data['type']) {
            case 'create_room':
                $this->handleCreateRoom($client, $clientId, $data);
                break;
            case 'join_room':
                $this->handleJoinRoom($client, $clientId, $data);
                break;
            case 'leave_room':
                $this->handleLeaveRoom($client, $clientId, $data);
                break;
            case 'start_game':
                $this->handleStartGame($client, $clientId, $data);
                break;
            case 'player_move':
                $this->handlePlayerMove($client, $clientId, $data);
                break;
            case 'complete_task':
                $this->handleCompleteTask($client, $clientId, $data);
                break;
            case 'kill_player':
                $this->handleKillPlayer($client, $clientId, $data);
                break;
            case 'report_body':
                $this->handleReportBody($client, $clientId, $data);
                break;
            case 'call_meeting':
                $this->handleCallMeeting($client, $clientId, $data);
                break;
            case 'cast_vote':
                $this->handleCastVote($client, $clientId, $data);
                break;
            case 'end_meeting':
                $this->handleEndMeeting($client, $clientId, $data);
                break;
            case 'end_voting':
                $this->handleEndVoting($client, $clientId, $data);
                break;
            case 'chat_message':
                $this->handleChatMessage($client, $clientId, $data);
                break;
            case 'sync_state':
                $this->handleSyncState($client, $clientId, $data);
                break;
            case 'ping':
                $client->send(json_encode(['type' => 'pong']));
                break;
            default:
                $client->send(json_encode(['type' => 'error', 'message' => 'Bilinmeyen mesaj tipi']));
                break;
        }
    }
    
    private function handleCreateRoom($client, $clientId, $data) {
        $result = $this->roomManager->createRoom($data['room'], $data['player']);
        
        if ($result['success']) {
            $this->clients[$clientId]['roomCode'] = $result['room']['roomCode'];
            $this->clients[$clientId]['playerId'] = $result['playerId'];
            
            $client->send(json_encode([
                'type' => 'room_joined',
                'room' => $result['room'],
                'playerId' => $result['playerId'],
                'hostId' => $result['hostId'],
                'isAdmin' => $result['isAdmin']
            ]));
        } else {
            $client->send(json_encode([
                'type' => 'error',
                'message' => $result['message']
            ]));
        }
    }
    
    private function handleJoinRoom($client, $clientId, $data) {
        $result = $this->roomManager->joinRoom($data['roomCode'], $data['player']);
        
        if ($result['success']) {
            $this->clients[$clientId]['roomCode'] = $data['roomCode'];
            $this->clients[$clientId]['playerId'] = $result['playerId'];
            
            $client->send(json_encode([
                'type' => 'room_joined',
                'room' => $result['room'],
                'playerId' => $result['playerId'],
                'hostId' => $result['hostId'],
                'isAdmin' => $result['isAdmin']
            ]));
            
            // Diğer oyunculara bildir
            $this->broadcastToRoom($data['roomCode'], json_encode([
                'type' => 'player_joined',
                'player' => [
                    'id' => $result['playerId'],
                    'name' => $data['player']['name'],
                    'color' => $data['player']['color'],
                    'isHost' => false,
                    'isBot' => false
                ]
            ]), $clientId);
        } else {
            $client->send(json_encode([
                'type' => 'error',
                'message' => $result['message']
            ]));
        }
    }
    
    private function handleLeaveRoom($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        $playerId = $this->clients[$clientId]['playerId'];
        
        if ($roomCode && $playerId) {
            $result = $this->roomManager->leaveRoom($roomCode, $playerId);
            
            if ($result['success']) {
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'player_left',
                    'playerId' => $playerId,
                    'playerName' => $result['playerName'] ?? 'Unknown'
                ]));
            }
            
            $this->clients[$clientId]['roomCode'] = null;
            $this->clients[$clientId]['playerId'] = null;
        }
    }
    
    private function handleStartGame($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->startGame($roomCode);
            
            if ($result['success']) {
                // Tüm oyunculara oyun başladığını bildir
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'game_started',
                    'gameState' => $result['gameState']
                ]));
            } else {
                $client->send(json_encode([
                    'type' => 'error',
                    'message' => $result['message']
                ]));
            }
        }
    }
    
    private function handlePlayerMove($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->movePlayer($roomCode, $data['playerId'], $data['x'], $data['y'], $data['direction']);
            
            if ($result['success']) {
                // Diğer oyunculara bildir
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'player_updated',
                    'playerId' => $data['playerId'],
                    'player' => $result['player']
                ]), $clientId);
            }
        }
    }
    
    private function handleCompleteTask($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->completeTask($roomCode, $data['playerId'], $data['taskId']);
            
            if ($result['success']) {
                // Tüm oyunculara bildir
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'task_completed',
                    'taskId' => $data['taskId'],
                    'playerId' => $data['playerId']
                ]));
            }
        }
    }
    
    private function handleKillPlayer($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->killPlayer($roomCode, $data['killerId'], $data['playerId']);
            
            if ($result['success']) {
                // Tüm oyunculara bildir
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'player_killed',
                    'playerId' => $data['playerId'],
                    'killerId' => $data['killerId']
                ]));
            }
        }
    }
    
    private function handleReportBody($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->reportBody($roomCode, $data['playerId'], $data['bodyId']);
            
            if ($result['success']) {
                // Tüm oyunculara bildir
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'body_reported',
                    'body' => $result['body'],
                    'reportedBy' => $data['playerId']
                ]));
            }
        }
    }
    
    private function handleCallMeeting($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->callMeeting($roomCode, $data['playerId']);
            
            if ($result['success']) {
                // Tüm oyunculara bildir
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'meeting_called',
                    'calledBy' => $data['playerId']
                ]));
            }
        }
    }
    
    private function handleCastVote($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->castVote($roomCode, $data['playerId'], $data['targetId']);
            
            if ($result['success']) {
                // Tüm oyunculara bildir
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'vote_cast',
                    'playerId' => $data['playerId'],
                    'targetId' => $data['targetId']
                ]));
            }
        }
    }
    
    private function handleEndMeeting($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->endMeeting($roomCode);
            
            if ($result['success']) {
                // Tüm oyunculara bildir
                $this->broadcastToRoom($roomCode, json_encode([
                    'type' => 'meeting_ended'
                ]));
            }
        }
    }
    
    private function handleEndVoting($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            $result = $this->roomManager->endVoting($roomCode);
            
            if ($result['success']) {
                // Oyun sonu kontrolü
                $room = $this->roomManager->getRoom($roomCode);
                if ($room && $room['state'] === 'ended') {
                    $this->broadcastToRoom($roomCode, json_encode([
                        'type' => 'game_ended',
                        'winner' => $room['winner'],
                        'gameState' => $this->roomManager->getGameStateForPlayer($roomCode, '')
                    ]));
                } else {
                    $this->broadcastToRoom($roomCode, json_encode([
                        'type' => 'voting_ended',
                        'ejectedPlayerId' => $result['ejectedPlayerId']
                    ]));
                }
            }
        }
    }
    
    private function handleChatMessage($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        
        if ($roomCode) {
            // Tüm oyunculara mesajı ilet
            $this->broadcastToRoom($roomCode, json_encode([
                'type' => 'chat_message',
                'playerId' => $data['playerId'],
                'message' => $data['message']
            ]));
        }
    }
    
    private function handleSyncState($client, $clientId, $data) {
        $roomCode = $this->clients[$clientId]['roomCode'];
        $playerId = $this->clients[$clientId]['playerId'];
        
        if ($roomCode && $playerId) {
            $gameState = $this->roomManager->getGameStateForPlayer($roomCode, $playerId);
            
            if ($gameState) {
                $client->send(json_encode([
                    'type' => 'sync_state',
                    'state' => $gameState,
                    'playerId' => $playerId
                ]));
            }
        }
    }
    
    private function broadcastToRoom($roomCode, $message, $excludeClientId = null) {
        foreach ($this->clients as $clientId => $clientData) {
            if ($clientData['roomCode'] === $roomCode && $clientId !== $excludeClientId) {
                try {
                    $clientData['client']->send($message);
                } catch (Exception $e) {
                    echo "Error sending to client $clientId: {$e->getMessage()}\n";
                }
            }
        }
    }
}

// WebSocket sunucusu başlatma
// Bu kısım, PHP WebSocket sunucusu (Ratchet gibi) kullanıldığında çalışır
// Basit bir WebSocket sunucusu için node.js tabanlı bir sunucu kullanmanız önerilir

// Örnek: Ratchet WebSocket sunucusu
// require 'vendor/autoload.php';
// use Ratchet\Server\IoServer;
// use Ratchet\Http\HttpServer;
// use Ratchet\WebSocket\WsServer;
// use MyApp\WebSocketServer;
//
// $server = IoServer::factory(
//     new HttpServer(new WsServer(new WebSocketServer()))
//     , 8080
// );
// $server->run();

// Bu dosya, HTTP isteklerini ve WebSocket mesajlarını işlemek için kullanılır
// Gerçek bir WebSocket sunucusu kurmak için ek yapılandırma gereklidir

// Şu an için, sadece HTTP API'sini sunuyoruz
echo "Among Us PHP Backend - Ready\n";
