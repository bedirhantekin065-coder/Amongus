<?php
// ===== AMONG US TÜRKÇE - ANA PHP DOSYASI =====

// Hata raporlamayı aç
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Oturum yönetimi
session_start();

// CORS başlıkları
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");
header("Content-Type: application/json");

// Oda yöneticisini dahil et
require_once 'RoomManager.php';

// İstek türüne göre işle
$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Oda yöneticisini al
$roomManager = getRoomManager();

// Basit API endpoint'leri
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
        echo json_encode(['success' => false, 'message' => 'Invalid request method']);
        break;
}

// GET isteklerini işle
function handleGetRequest($roomManager, $action) {
    switch ($action) {
        case 'list_rooms':
            // Açık odaları listele
            $rooms = $roomManager->listOpenRooms();
            echo json_encode(['success' => true, 'rooms' => $rooms]);
            break;
            
        case 'get_room':
            // Belirli bir odanın bilgilerini al
            $roomCode = $_GET['roomCode'] ?? '';
            $room = $roomManager->getRoom($roomCode);
            if ($room) {
                $playerId = $_GET['playerId'] ?? '';
                $gameState = $roomManager->getGameStateForPlayer($roomCode, $playerId);
                echo json_encode(['success' => true, 'room' => $room, 'gameState' => $gameState]);
            } else {
                echo json_encode(['success' => false, 'message' => 'Room not found']);
            }
            break;
            
        case 'get_all_rooms':
            // Tüm odaları al (admin için)
            $rooms = $roomManager->getAllRooms();
            echo json_encode(['success' => true, 'rooms' => $rooms]);
            break;
            
        default:
            // Ana sayfa - basit bir mesaj
            echo json_encode([
                'success' => true,
                'message' => 'Among Us Türkçe - PHP Backend',
                'version' => '1.0.0',
                'endpoints' => [
                    'GET /api.php?action=list_rooms' => 'List open rooms',
                    'GET /api.php?action=get_room&roomCode=ABC123' => 'Get room info',
                    'POST /api.php?action=create_room' => 'Create new room',
                    'POST /api.php?action=join_room' => 'Join a room',
                    'POST /api.php?action=leave_room' => 'Leave a room',
                    'POST /api.php?action=start_game' => 'Start game'
                ]
            ]);
            break;
    }
}

// POST isteklerini işle
function handlePostRequest($roomManager, $action) {
    // JSON verilerini al
    $json = file_get_contents('php://input');
    $data = json_decode($json, true);
    
    if (json_last_error() !== JSON_ERROR_NONE) {
        echo json_encode(['success' => false, 'message' => 'Invalid JSON data']);
        return;
    }
    
    switch ($action) {
        case 'create_room':
            // Oda oluştur
            $player = [
                'name' => $data['player']['name'] ?? 'Unknown',
                'color' => $data['player']['color'] ?? 'red'
            ];
            $result = $roomManager->createRoom($data['room'], $player);
            echo json_encode($result);
            break;
            
        case 'join_room':
            // Odaya katıl
            $player = [
                'name' => $data['player']['name'] ?? 'Unknown',
                'color' => $data['player']['color'] ?? 'red'
            ];
            $result = $roomManager->joinRoom($data['roomCode'], $player);
            echo json_encode($result);
            break;
            
        case 'leave_room':
            // Odadan ayrıl
            $result = $roomManager->leaveRoom($data['roomCode'], $data['playerId']);
            echo json_encode($result);
            break;
            
        case 'start_game':
            // Oyunu başlat
            $result = $roomManager->startGame($data['roomCode']);
            echo json_encode($result);
            break;
            
        case 'player_move':
            // Oyuncu hareketi
            $result = $roomManager->movePlayer(
                $data['roomCode'], 
                $data['playerId'], 
                $data['x'], 
                $data['y'], 
                $data['direction']
            );
            echo json_encode($result);
            break;
            
        case 'complete_task':
            // Görev tamamla
            $result = $roomManager->completeTask(
                $data['roomCode'], 
                $data['playerId'], 
                $data['taskId']
            );
            echo json_encode($result);
            break;
            
        case 'kill_player':
            // Oyuncu öldür
            $result = $roomManager->killPlayer(
                $data['roomCode'], 
                $data['killerId'], 
                $data['playerId']
            );
            echo json_encode($result);
            break;
            
        case 'report_body':
            // Ceset bildir
            $result = $roomManager->reportBody(
                $data['roomCode'], 
                $data['playerId'], 
                $data['bodyId']
            );
            echo json_encode($result);
            break;
            
        case 'call_meeting':
            // Toplantı çağır
            $result = $roomManager->callMeeting(
                $data['roomCode'], 
                $data['playerId']
            );
            echo json_encode($result);
            break;
            
        case 'cast_vote':
            // Oy kullan
            $result = $roomManager->castVote(
                $data['roomCode'], 
                $data['playerId'], 
                $data['targetId']
            );
            echo json_encode($result);
            break;
            
        case 'end_meeting':
            // Toplantıyı sonlandır
            $result = $roomManager->endMeeting($data['roomCode']);
            echo json_encode($result);
            break;
            
        case 'end_voting':
            // Oylamayı sonlandır
            $result = $roomManager->endVoting($data['roomCode']);
            echo json_encode($result);
            break;
            
        case 'sync_state':
            // Durumu senkronize et
            $roomCode = $data['roomCode'] ?? '';
            $playerId = $data['playerId'] ?? '';
            $gameState = $roomManager->getGameStateForPlayer($roomCode, $playerId);
            echo json_encode(['success' => true, 'state' => $gameState]);
            break;
            
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action']);
            break;
    }
}

// Ana sayfa için HTML
if (!isset($_GET['action']) && !isset($_POST['action'])) {
    header("Content-Type: text/html; charset=UTF-8");
    echo '<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Among Us Türkçe - PHP Backend</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            background: #121212;
            color: #ffffff;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: #1e1e1e;
            padding: 20px;
            border-radius: 10px;
        }
        h1 {
            color: #ff6b6b;
            text-align: center;
        }
        p {
            line-height: 1.6;
        }
        .endpoint {
            background: #252525;
            padding: 10px;
            margin: 10px 0;
            border-radius: 5px;
            font-family: monospace;
        }
        .method {
            color: #4CAF50;
            font-weight: bold;
        }
        .url {
            color: #2196F3;
        }
        .description {
            color: #aaaaaa;
            margin-left: 20px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>Among Us Türkçe - PHP Backend</h1>
        <p>Bu, Among Us benzeri oyun için PHP tabanlı backend servisidir.</p>
        
        <h2>API Endpointleri</h2>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api.php?action=list_rooms</span>
            <div class="description">Açık odaları listele</div>
        </div>
        
        <div class="endpoint">
            <span class="method">GET</span> <span class="url">/api.php?action=get_room&roomCode=ABC123</span>
            <div class="description">Belirli bir odanın bilgilerini al</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=create_room</span>
            <div class="description">Yeni oda oluştur</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=join_room</span>
            <div class="description">Odaya katıl</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=leave_room</span>
            <div class="description">Odadan ayrıl</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=start_game</span>
            <div class="description">Oyunu başlat</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=player_move</span>
            <div class="description">Oyuncu hareketi</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=complete_task</span>
            <div class="description">Görev tamamla</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=kill_player</span>
            <div class="description">Oyuncu öldür</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=report_body</span>
            <div class="description">Ceset bildir</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=call_meeting</span>
            <div class="description">Toplantı çağır</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=cast_vote</span>
            <div class="description">Oy kullan</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=end_meeting</span>
            <div class="description">Toplantıyı sonlandır</div>
        </div>
        
        <div class="endpoint">
            <span class="method">POST</span> <span class="url">/api.php?action=end_voting</span>
            <div class="description">Oylamayı sonlandır</div>
        </div>
        
        <h2>WebSocket Kullanımı</h2>
        <p>Gerçek zamanlı oyun için WebSocket bağlantısı gereklidir. WebSocket sunucusu kurmak için lütfen <code>websocket-server.php</code> dosyasını inceleyin.</p>
        
        <h2>Not</h2>
        <p>Bu basit bir PHP backend implementasyonudur. Gerçek bir üretim ortamında:</p>
        <ul>
            <li>Veritabanı kullanın (MySQL, MongoDB, vb.)</li>
            <li>Güvenlik önlemleri alın (SQL injection, XSS, vb.)</li>
            <li>WebSocket sunucusu kurun (Ratchet, Socket.io, vb.)</li>
            <li>Oturum yönetimini iyileştirin</li>
            <li>Hata yönetimini iyileştirin</li>
        </ul>
    </div>
</body>
</html>';
}
