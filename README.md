# Among Us Türkçe - Tamamen Ücretsiz ve Açık Kaynak

Bu, popüler Among Us oyununa benzer, Türkçe dilini destekleyen, çok oyunculu bir web tabanlı oyundur. Tamamen ücretsizdir ve herkes tarafından kullanılabilir.

## Özellikler

- ✅ **Türkçe Arayüz** - Tamamen Türkçe dil desteği
- ✅ **Çok Oyunculu** - 1-10 kişi arasında oyun oynayabilirsiniz
- ✅ **Gerçek Zamanlı** - WebSocket tabanlı anında senkronizasyon
- ✅ **Bot Desteği** - Zeki AI botları ile oynayabilirsiniz
- ✅ **Görev Sistemi** - Among Us'taki gibi görevler
- ✅ **Toplantı Sistemi** - Oyuncularla toplantı yapabilirsiniz
- ✅ **Imposter Mekaniği** - Gizli roller ve öldürme
- ✅ **Animasyonlar** - Akıcı ve görsel olarak çekici animasyonlar
- ✅ **Admin Paneli** - Sunucu yönetimi
- ✅ **Çerez Kaydı** - Kullanıcı adı ve renk kaydı

## Kurulum

### Gerekli Yazılımlar

- Node.js (v14+)
- PHP (7.4+)
- Web Sunucusu (Apache, Nginx, vb.)

### Adım 1: Depoyu İndir

```bash
git clone https://github.com/sizin-kullanici-adiniz/amongus-turkce.git
cd amongus-turkce
```

### Adım 2: Node.js Bağımlılıklarını Kur

```bash
npm install
```

### Adım 3: WebSocket Sunucusunu Başlat

```bash
npm start
# veya geliştirme modunda:
npm run dev
```

WebSocket sunucusu `ws://localhost:8080` adresinde çalışacaktır.

### Adım 4: PHP Sunucusunu Kur

PHP dosyalarınızı web sunucunuza yerleştirin:

```bash
# Apache örneği
sudo cp -r * /var/www/html/amongus

# veya yerel sunucu
php -S localhost:8000
```

### Adım 5: Tarayıcıda Aç

Tarayıcınızda `http://localhost:8000` adresini açın.

## Kullanım

### 1. Kullanıcı Adı Belirle

- İlk olarak kullanıcı adınızı ve renk seçiniz
- Bu bilgiler çerezlerde kaydedilecektir

### 2. Oda Oluştur veya Katıl

- **Oda Oluştur**: Yeni bir oyun odası oluşturun
  - Oda adı belirleyin
  - Maksimum oyuncu sayısını ayarlayın (4-10)
  - Harita seçin (The Skeld, Mira HQ, Polus)
  - Imposter sayısını ayarlayın
  - Bot ekleyip eklememeyi seçin

- **Odaya Katıl**: Varolan bir odaya katılın
  - Oda kodunu girin (6 karakter)
  - veya açık odalar listesinden seçin

### 3. Oyunu Başlat

- Oda sahibiyseniz, oyunu başlatabilirsiniz
- Minimum 4 oyuncu gereklidir

### 4. Oyun Kontrolleri

**Klavye:**
- **Yön Tuşları / WASD**: Hareket et
- **Boşluk**: Acil durum toplantısı çağır
- **E**: Görev yap / Ceset bildir
- **Q**: Öldür (sadece Imposter için)

**Fare:**
- Haritaya tıklayarak karakterinizi hareket ettirebilirsiniz

### 5. Oyun Mekaniği

- **Crewmate**: Görevleri tamamlayarak kazanabilirsiniz
- **Imposter**: Diğer oyuncuları öldürerek kazanabilirsiniz
- **Ceset Bildir**: Ceset bulduğunuzda toplantı çağırın
- **Toplantı**: Oyuncularla konuşun ve şüphelileri oyla

## Dosya Yapısı

```
amongus-turkce/
├── index.html           # Ana HTML sayfası
├── css/
│   └── styles.css       # Tüm CSS stilleri
├── js/
│   ├── config.js        # Oyun yapılandırması
│   ├── utils.js         # Yardımcı fonksiyonlar
│   ├── animations.js    # Animasyon sistemleri
│   ├── bot-ai.js        # Bot AI sistemleri
│   ├── game.js          # Oyun mantığı
│   ├── ui.js            # UI fonksiyonları
│   └── main.js          # Ana uygulama giriş noktası
├── php/
│   ├── index.php        # PHP API endpoint'leri
│   └── RoomManager.php  # Oda yönetim sistemi
├── websocket-server.js # WebSocket sunucusu
├── package.json         # Node.js bağımlılıkları
└── README.md            # Bu dosya
```

## Bot AI Sistemi

Oyun, farklı zorluk seviyelerine sahip zeki botları destekler:

- **Kolay Bot**: Basit hareketler ve rastgele eylemler
- **Normal Bot**: Akıllı hedef seçimleri
- **Zeki Bot**: Oyuncu davranışlarını analiz eden gelişmiş AI

Botlar:
- Görev yapabilir
- Oyuncuları öldürebilir (sadece Imposter botlar)
- Ceset bildirebilir
- Toplantı çağırabilir
- Akıllıca oy kullanabilir

## Admin Paneli

Admin paneli ile:
- Tüm odaları görüntüleyebilirsiniz
- Botları yönetebilirsiniz
- Oyuncuları izleyebilirsiniz
- Sunucu ayarlarını değiştirebilirsiniz

**Admin Erişimi:**
- Yerel sunucuda (`localhost`) tüm kullanıcılar admin yetkisine sahiptir
- Üretim sunucusunda admin kontrolünü kendiniz uygulamanız gerekebilir

## Geliştirme

### Katkıda Bulunma

1. Bu depoyu fork edin
2. Yeni bir branch oluşturun (`git checkout -b feature/yeniozellik`)
3. Değişikliklerinizi commit edin (`git commit -m 'Yeni özellik eklendi'`)
4. Branch'inizi push edin (`git push origin feature/yeniozellik`)
5. Pull Request oluşturun

### API Endpoint'leri

**HTTP API (PHP):**
- `GET /api.php?action=list_rooms` - Açık odaları listele
- `GET /api.php?action=get_room&roomCode=ABC123` - Oda bilgisi al
- `POST /api.php?action=create_room` - Oda oluştur
- `POST /api.php?action=join_room` - Odaya katıl
- `POST /api.php?action=leave_room` - Odadan ayrıl
- `POST /api.php?action=start_game` - Oyunu başlat

**WebSocket API:**
- `create_room` - Oda oluştur
- `join_room` - Odaya katıl
- `leave_room` - Odadan ayrıl
- `start_game` - Oyunu başlat
- `player_move` - Oyuncu hareketi
- `complete_task` - Görev tamamla
- `kill_player` - Oyuncu öldür
- `report_body` - Ceset bildir
- `call_meeting` - Toplantı çağır
- `cast_vote` - Oy kullan
- `end_meeting` - Toplantıyı sonlandır
- `end_voting` - Oylamayı sonlandır
- `chat_message` - Mesaj gönder
- `sync_state` - Durumu senkronize et

## Sorun Giderme

### WebSocket Bağlantı Sorunları

1. WebSocket sunucusunun çalıştığından emin olun:
   ```bash
   npm start
   ```

2. Tarayıcınızın WebSocket'i desteklediğinden emin olun

3. Güvenlik duvarınızın 8080 portunu engellemediğinden emin olun

### PHP Hataları

1. PHP sürümünüzün 7.4+ olduğunu kontrol edin:
   ```bash
   php -v
   ```

2. Gerekli PHP eklentilerini kurun:
   ```bash
   sudo apt-get install php-json php-mbstring
   ```

### Performans Sorunları

1. Node.js sunucusunu yeniden başlatın
2. Tarayıcı önbelleğinizi temizleyin
3. Daha az bot kullanın

## Lisans

Bu proje MIT Lisansı altında lisanslanmıştır. Ayrıntılar için `LICENSE` dosyasına bakın.

## İletişim

Sorularınız veya önerileriniz için:
- GitHub Issues bölümünü kullanın
- veya e-posta gönderin

---

**Not:** Bu oyun tamamen eğitim amaçlıdır ve Among Us oyununa ait herhangi bir hak iddia etmez. Tüm haklar InnerSloth'a aittir.
