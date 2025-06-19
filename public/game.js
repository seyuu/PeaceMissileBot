let tg, currentUser, db;

// --- Oyun Konfigürasyonu ---
const firebaseConfig = {
  apiKey: "AIzaSyBtOkm8dpjVXlzAXCEB5sL_Awqq4HEeemc",
  authDomain: "peacemissile-game.firebaseapp.com",
  projectId: "peacemissile-game",
  storageBucket: "peacemissile-game.firebasestorage.app",
  messagingSenderId: "641906716058",
  appId: "1:641906716058:web:1376e93994fab29f049e23"
};
// -- Firebase Config (web için sadece okuma yapılacak!)
// Firebase'i skor tablosu için sadece KULLANICIYA SKOR GÖSTERMEK için yüklemek istiyorsan, kendi config ile ekle! Yazma işini bot.py yapacak, webden yazma YOK! (Yorum satırı bıraktım!)

// --- Oyun Ayarları ---
const buildingData = {
    iran: [
        { x: 100, y: 400 },
        { x: 170, y: 410 },
        { x: 260, y: 410 },
        { x: 60, y: 470 },
        { x: 140, y: 520 },
        { x: 260, y: 520 },
        { x: 320, y: 470 },
        { x: 320, y: 560 },
        { x: 100, y: 580 },
        { x: 250, y: 620 }
    ],
    israel: [
        { x: 120, y: 480 },
        { x: 210, y: 430 },
        { x: 270, y: 480 },
        { x: 80, y: 550 },
        { x: 170, y: 530 },
        { x: 250, y: 550 },
        { x: 320, y: 540 },
        { x: 360, y: 600 },
        { x: 120, y: 640 },
        { x: 230, y: 670 }
    ]
};
// Binalar için örnek health
const BUILDING_HEALTH = 2;

// --- Asset paths ---
const assets = {
    iran_bg: 'assets/iran_bg.jpg',
    israel_bg: 'assets/israel_bg.jpg',
    lobby_bg: 'assets/lobby_bg.png',
    logo: 'assets/logo.png',
    destroyed_building: 'assets/destroyed_building.png',
    rocket: 'assets/rocket.png',
    explosion: 'assets/explosion.gif',
    dove: 'assets/dove.png',
    smoke: 'assets/explosion.gif', // duman efekti için aynı gif, gerekirse ek sprite kullanılır
    coin: 'assets/coin_icon.png',
    score_icon: 'assets/score_icon.png'
};

// --- Global state ---
let globalUserData = {
    username: "Player",
    maxScore: 0,
    totalScore: 0,
    coins: 0,
    leaderboard: []
};

// --- Lobby/Menu Scene ---
class LobbyScene extends Phaser.Scene {
    constructor() { super({ key: 'LobbyScene' }); }
    preload() {
        this.load.image('lobby_bg', assets.lobby_bg);
        this.load.image('logo', assets.logo);
        this.load.image('score_icon', assets.score_icon);
        this.load.image('coin', assets.coin);
    }
    create() {
        this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'lobby_bg')
            .setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        // Logo animasyonu
        this.add.image(this.cameras.main.centerX, 100, 'logo').setScale(0.7);

        // Kullanıcı bilgileri (örnek, gerçek veriyi Telegram WebApp'den al)
        const user = globalUserData;
        this.add.text(30, 180, `Welcome, ${user.username}!`, { font: '22px monospace', color: "#fff" });
        this.add.image(40, 230, 'score_icon').setScale(0.8);
        this.add.text(75, 222, `Max Score: ${user.maxScore}`, { font: '18px monospace', color: "#fff" });
        this.add.text(220, 222, `Total Score: ${user.totalScore}`, { font: '18px monospace', color: "#fff" });
        this.add.image(40, 265, 'coin').setScale(0.8);
        this.add.text(75, 258, `PMNOFO Coins: ${user.coins}`, { font: '18px monospace', color: "#fff" });

        // Bilgilendirme
        this.add.text(30, 295, "Goal: Tap the rockets before they hit the buildings!\nTap Start to choose your side.", { font: '16px monospace', color: "#ffd" });

        // Start ve Leaderboard butonları
        const startBtn = this.add.text(this.cameras.main.centerX, 340, "START MISSION", { font: '28px monospace', color: "#1df", backgroundColor: "#133" })
            .setOrigin(0.5).setPadding(12).setInteractive();
        startBtn.on('pointerdown', () => { this.scene.start('SideSelectScene'); });

        // Leaderboard Table
        this.add.text(this.cameras.main.centerX, 390, "Top Players", { font: '20px monospace', color: "#ff0" }).setOrigin(0.5, 0);
        let lb = user.leaderboard || [];
        if (lb.length === 0) lb = [{ username: "Player1", totalScore: 1200 }, { username: "Player2", totalScore: 1100 }];
        for (let i = 0; i < Math.min(5, lb.length); i++) {
            this.add.text(this.cameras.main.centerX - 100, 420 + i * 28, `${i + 1}. ${lb[i].username} - ${lb[i].totalScore} pts`, { font: '16px monospace', color: "#fff" });
        }
    }
}

// --- Taraf Seçim ---
class SideSelectScene extends Phaser.Scene {
    constructor() { super({ key: 'SideSelectScene' }); }
    preload() {
        this.load.image('iran_bg', assets.iran_bg);
        this.load.image('israel_bg', assets.israel_bg);
    }
    create() {
        this.cameras.main.setBackgroundColor("#000");
        this.add.text(this.cameras.main.centerX, 120, "Choose your side", { font: '32px monospace', color: "#fff" }).setOrigin(0.5);

        // İran
        let iranImg = this.add.image(this.cameras.main.centerX - 100, 250, 'iran_bg').setDisplaySize(120, 160).setInteractive();
        this.add.text(this.cameras.main.centerX - 100, 335, "Defend Iran", { font: '20px monospace', color: "#fff" }).setOrigin(0.5, 0);

        // İsrail
        let isrImg = this.add.image(this.cameras.main.centerX + 100, 250, 'israel_bg').setDisplaySize(120, 160).setInteractive();
        this.add.text(this.cameras.main.centerX + 100, 335, "Defend Israel", { font: '20px monospace', color: "#fff" }).setOrigin(0.5, 0);

        iranImg.on('pointerdown', () => { this.scene.start('GameScene', { side: 'iran' }); });
        isrImg.on('pointerdown', () => { this.scene.start('GameScene', { side: 'israel' }); });
    }
}

// --- Oyun ---
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    preload() {
        this.load.image('iran_bg', assets.iran_bg);
        this.load.image('israel_bg', assets.israel_bg);
        this.load.image('rocket', assets.rocket);
        this.load.image('dove', assets.dove);
        this.load.image('destroyed_building', assets.destroyed_building);
        this.load.image('coin', assets.coin);
        this.load.image('score_icon', assets.score_icon);
        this.load.spritesheet('explosion', assets.explosion, { frameWidth: 64, frameHeight: 64 });
        // ...duman efekti için gerekirse ayrı ekle
    }
    create(data) {
        // Arka plan
        let side = data.side || "israel";
        this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, side === "iran" ? "iran_bg" : "israel_bg")
            .setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        // Binalar
        this.buildings = [];
        let bArr = buildingData[side];
        for (let b of bArr) {
            let building = this.add.rectangle(b.x, b.y, 50, 60, 0xffffff, 0.01); // Görünmez alan, istersen sprite ile değiş
            building.health = BUILDING_HEALTH;
            building.side = side;
            building.alive = true;
            building.setInteractive();
            this.buildings.push(building);

            // Health bar
            building.healthBar = this.add.graphics();
            this.updateHealthBar(building);
        }

        // Skor
        this.score = 0;
        this.scoreText = this.add.text(30, 20, "Score: 0", { font: '24px monospace', color: "#fff" });

        // Bombalar (tekrar çağrılan zamanlayıcı)
        this.bombs = [];
        this.bombTimer = this.time.addEvent({
            delay: 1100,
            callback: this.spawnBomb,
            callbackScope: this,
            loop: true
        });

        // Oyun bitimi
        this.gameOver = false;
    }

    spawnBomb() {
        if (this.gameOver) return;

        // Hedef binayı seç
        let liveBuildings = this.buildings.filter(b => b.alive);
        if (liveBuildings.length === 0) return;
        let target = Phaser.Utils.Array.GetRandom(liveBuildings);

        // Yüksek ihtimal üstten dikey, %25 ihtimal yandan açılı
        let fromSide = Math.random() < 0.25;
        let x, y, vx, vy;
        if (!fromSide) {
            x = target.x;
            y = 0;
            vx = 0;
            vy = Phaser.Math.Between(170, 240);
        } else {
            // Rastgele sağdan ya da soldan açılı
            if (Math.random() < 0.5) {
                x = 0; y = target.y - Phaser.Math.Between(80, 120);
                vx = Phaser.Math.Between(150, 230);
                vy = Phaser.Math.Between(100, 200);
            } else {
                x = this.cameras.main.width; y = target.y - Phaser.Math.Between(80, 120);
                vx = -Phaser.Math.Between(150, 230);
                vy = Phaser.Math.Between(100, 200);
            }
        }
        let bomb = this.physics.add.sprite(x, y, 'rocket');
        bomb.setDisplaySize(32, 50);
        bomb.target = target;
        bomb.setInteractive();
        bomb.vx = vx / 1000;
        bomb.vy = vy / 1000;
        this.bombs.push(bomb);

        // Bombaya tıklandığında
        bomb.on('pointerdown', () => {
            this.bombExplode(bomb, false);
        });
    }

    update(time, delta) {
        if (this.gameOver) return;

        // Bombaların hareketi ve çarpışma kontrolü
        for (let bomb of this.bombs) {
            if (!bomb.active) continue;
            bomb.x += bomb.vx * delta;
            bomb.y += bomb.vy * delta;

            // Çarpışma kontrolü
            let b = bomb.target;
            if (b && b.alive && Phaser.Geom.Rectangle.Contains(b.getBounds(), bomb.x, bomb.y)) {
                this.bombExplode(bomb, true);
            }
            // Ekran dışına çıkarsa yok et
            if (bomb.y > this.cameras.main.height + 60 || bomb.x < -40 || bomb.x > this.cameras.main.width + 40) {
                bomb.destroy();
            }
        }
        // Sağ kalan bombaları filtrele
        this.bombs = this.bombs.filter(b => b.active);

        // Bina health bar güncelle
        for (let b of this.buildings) {
            this.updateHealthBar(b);
        }
    }

    bombExplode(bomb, isHitBuilding) {
        if (!bomb.active) return;
        // Patlama efekti
        let exp = this.add.sprite(bomb.x, bomb.y, 'explosion').setScale(0.8);
        this.time.delayedCall(400, () => exp.destroy());
        // Güvercin efekti (sadece bombaya tıklandıysa)
        if (!isHitBuilding) {
            let dove = this.add.image(bomb.x, bomb.y, 'dove').setScale(0.35);
            this.tweens.add({
                targets: dove, y: dove.y - 80, alpha: 0,
                duration: 700, onComplete: () => dove.destroy()
            });
            this.score += 10;
            this.scoreText.setText(`Score: ${this.score}`);
        }
        // Bina hasar aldıysa:
        if (isHitBuilding && bomb.target) {
            let b = bomb.target;
            if (b.alive) {
                b.health -= 1;
                if (b.health <= 0) {
                    b.alive = false;
                    // Bina yok olduysa: destroyed_building ve duman efekti
                    let des = this.add.image(b.x, b.y + 15, 'destroyed_building').setDisplaySize(55, 65);
                    let smoke = this.add.sprite(b.x, b.y - 10, 'explosion').setScale(0.7);
                    this.time.delayedCall(900, () => smoke.destroy());
                }
                // Game over kontrol
                if (this.buildings.filter(bb => bb.alive).length === 0) {
                    this.gameOver = true;
                    this.scene.start('GameOverScene', { score: this.score });
                }
            }
        }
        bomb.destroy();
    }

    updateHealthBar(building) {
        if (!building.healthBar) return;
        building.healthBar.clear();
        if (!building.alive) return;
        // Bina üstüne health bar
        let w = 38, h = 7;
        building.healthBar.fillStyle(0x008800, 0.7);
        building.healthBar.fillRect(building.x - w / 2, building.y - 36, w * (building.health / BUILDING_HEALTH), h);
        building.healthBar.lineStyle(1, 0xffffff, 1);
        building.healthBar.strokeRect(building.x - w / 2, building.y - 36, w, h);
    }
}

// --- GameOver Scene ---
class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }
    create(data) {
        this.cameras.main.setBackgroundColor("#222");
        this.add.text(this.cameras.main.centerX, 200, "Game Over!", { font: '36px monospace', color: "#fff" }).setOrigin(0.5);
        this.add.text(this.cameras.main.centerX, 250, `Score: ${data.score}`, { font: '28px monospace', color: "#ffd" }).setOrigin(0.5);

        // Skor Firebase'e gönderilecek
        sendScoreToBot(data.score); 

        const retryBtn = this.add.text(this.cameras.main.centerX, 340, "Play Again", { font: '24px monospace', color: "#1df", backgroundColor: "#133" })
            .setOrigin(0.5).setPadding(10).setInteractive();
        retryBtn.on('pointerdown', () => { this.scene.start('LobbyScene'); });
    }
}

// --- Phaser Başlat ---
const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: 420,
    height: 770,
    backgroundColor: "#000",
    scene: [LobbyScene, SideSelectScene, GameScene, GameOverScene],
    physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);

// Skor göndermek için:
function sendScoreToBot(currentScore) {
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.sendData(
            JSON.stringify({
                type: 'score_update',
                user_id: window.Telegram.WebApp.initDataUnsafe.user.id, // Telegramdan gelen user id
                score: currentScore
            })
        );
    }
}
 
