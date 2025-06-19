// --- Telegram & Firestore Setup (skor yazımı sadece bot.py ile olacak, burada sadece gösterim var) ---
let tg = window.Telegram && window.Telegram.WebApp;
let currentUser = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;

// --- Oyun Konfigürasyonu ---
const firebaseConfig = {
  apiKey: "AIzaSyBtOkm8dpjVXlzAXCEB5sL_Awqq4HEeemc",
  authDomain: "peacemissile-game.firebaseapp.com",
  projectId: "peacemissile-game",
  storageBucket: "peacemissile-game.appspot.com",
  messagingSenderId: "641906716058",
  appId: "1:641906716058:web:1376e93994fab29f049e23"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

let userStats = { username: "Player", score: 0, total_score: 0, total_pmno_coins: 0 };
// -- Firebase Config (web için sadece okuma yapılacak!)
// Firebase'i skor tablosu için sadece KULLANICIYA SKOR GÖSTERMEK için yüklemek istiyorsan, kendi config ile ekle! Yazma işini bot.py yapacak, webden yazma YOK! (Yorum satırı bıraktım!)
async function fetchUserStats() {
  if (!currentUser) return;
  const ref = db.collection("users").doc(String(currentUser.id));
  const snap = await ref.get();
  if (snap.exists) {
    userStats = snap.data();
  }
}


// --- Leaderboard Getir ---
async function fetchLeaderboard() {
  const snap = await db.collection("users").orderBy("total_score", "desc").limit(5).get();
  return snap.docs.map(doc => doc.data());
}

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
    coin: 'assets/coin_icon.png',
    score_icon: 'assets/score_icon.png',
     button:'assets/play_button.png',
    building_bar:'assets/score.png',
      smoke: 'assets/smoke_sheet.png' 
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
  constructor() { super('LobbyScene'); }
  async create() {
    const vars = getScaleVars(this);
           this.scene.start('LobbyScene');

    // BG tam ekran
    this.add.image(vars.w/2, vars.h/2, 'lobby_bg').setDisplaySize(vars.w, vars.h);
    // Logo (Üstte)
    this.add.image(vars.w/2, 70, 'logo').setScale(0.21);

    // Score & Coin ikonları (sağ üstte örnek)
    this.add.image(vars.w - 50, 45, 'score_icon').setScale(0.6);
    this.add.image(vars.w - 50, 90, 'coin_icon').setScale(0.6);
    await fetchUserStats();

    // SAĞ ÜST panel, PEACE'in üstünü kapatmaz!
    let panelX = vars.w - vars.topPanelW - vars.margin;
    let y = vars.margin;
    let statColor = "#ffe349";
    this.add.text(panelX, y, `Welcome, ${userStats.username || 'Player'}!`, { font: `${vars.fontSmall+2}px monospace`, fill: "#fff" }).setOrigin(0,0);
    y += vars.fontSmall + 8;
    this.add.text(panelX, y, `Max Score: ${userStats.score}`, { font: `${vars.fontSmall}px monospace`, fill: statColor }).setOrigin(0,0);
    y += vars.fontSmall + 4;
    this.add.text(panelX, y, `Total Score: ${userStats.total_score}`, { font: `${vars.fontSmall}px monospace`, fill: statColor }).setOrigin(0,0);
    y += vars.fontSmall + 4;
    this.add.text(panelX, y, `PMNOFO Coins: ${userStats.total_pmno_coins}`, { font: `${vars.fontSmall}px monospace`, fill: statColor }).setOrigin(0,0);

    // Start Mission butonu: ALTTA, ortada (hiçbir yazı üstüne binmez)
    let btnY = vars.h * 0.60;
    let startBtn = this.add.image(vars.w/2, btnY, 'button')
      .setScale(vars.btnScale).setInteractive();
    let btnLabel = this.add.text(vars.w, btnY, "", { font: `${vars.fontBig}px monospace`, fill: "#13f7f7" }).setOrigin(0.3);
    startBtn.on('pointerup', () => this.scene.start('SideSelectScene'));

    // Top Players — butonun üstünde, ortada
    let lbY = btnY - 300;
    this.add.text(vars.w/2, lbY, "Top Players", { font: `bold ${vars.fontMid+2}px monospace`, fill: "#ffe349" }).setOrigin(0.5, 0);
    const leaders = (await fetchLeaderboard()).slice(0, 5);
    lbY += vars.fontMid + 8;
    leaders.forEach((u, i) => {
      this.add.text(vars.w/2, lbY + i * (vars.fontSmall + 8), `${i + 1}. ${u.username || 'Anon'} - ${u.total_score} pts`, { font: `${vars.fontSmall+2}px monospace`, fill: "#fff" }).setOrigin(0.5, 0);
    });

    // Menü: Leaderboard & How to Play (aşağıda iki yana)
    let menuY = btnY + startBtn.displayHeight/2 + 28;
    this.add.text(vars.w/4, menuY, "Leaderboard", { font: `${vars.fontMid}px monospace`, fill: "#ffe349" })
      .setOrigin(0.5,0)
      .setInteractive().on('pointerup', () => this.scene.start('LeaderboardScene'));
    this.add.text(vars.w - vars.w/4, menuY, "How to Play?", { font: `${vars.fontMid}px monospace`, fill: "#43c0f7" })
      .setOrigin(0.5, 0)
      .setInteractive().on('pointerup', () => this.scene.start('HowToPlayScene'));

    // En altta BÜYÜK logo
    this.add.image(vars.w/2, vars.h - 95, 'logo').setScale(vars.logoScale);
  }
}

// --- Responsive Boyutlar ve Helper ---
function getScaleVars(scene) {
  // Boyutları ekrana oranla al, minimum ve maksimum koy
  const w = scene.cameras.main.width;
  const h = scene.cameras.main.height;
  return {
    w, h,
    fontBig: Math.max(Math.round(w/20), 18),
    fontMid: Math.max(Math.round(w/25), 15),
    fontSmall: Math.max(Math.round(w/32), 12),
    btnScale: Math.max(w/1400, 0.33),
    logoScale: Math.max(w/700, 0.21),
    topPanelW: Math.min(w * 0.55, 330),
    margin: Math.max(w/48, 10)
  };
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
        this.load.image('logo', assets.logo);
        this.load.image('button', assets.button);
        this.load.image('lobby_bg', assets.lobby_bg);
        this.load.image('building_bar', assets.building_bar);
        this.load.spritesheet('smoke', assets.smoke, { frameWidth: 64, frameHeight: 64 });
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
        bomb.rotation = Math.atan2(bomb.vy, bomb.vx) + Math.PI/2;bomb.rotation = Math.atan2(bomb.vy, bomb.vx) + Math.PI/2;
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
                    let des = this.add.image(b.x, b.y + 15, 'destroyed_building').setDisplaySize(90, 100);
                    let smoke = this.add.sprite(b.x, b.y - 10, 'smoke').setScale(0.7);
                    this.time.delayedCall(900, () => smoke.destroy());
                    showSmoke(this, b.x, b.y - 20);
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

// --- How to Play ve Leaderboard ekranı ekle ---
class HowToPlayScene extends Phaser.Scene {
  constructor() { super('HowToPlayScene'); }
  create() {
    const vars = getScaleVars(this);
    this.add.rectangle(vars.w/2, vars.h/2, vars.w, vars.h, 0x000000, 0.96);
    this.add.text(vars.w/2, vars.h*0.1, "How To Play", { font: `${vars.fontBig}px monospace`, fill: "#fff" }).setOrigin(0.5);
    let msg = "Tap the rockets to turn them into peace doves!\nDon't let them hit the city.\nDefend all buildings as long as you can!\nEach rocket = +1 point.\n\nBreak your record for more coins.";
    this.add.text(vars.w/2, vars.h*0.17, msg, { font: `${vars.fontSmall+3}px monospace`, fill: "#fff", align: "center" }).setOrigin(0.5,0);
    this.add.text(vars.w/2, vars.h - 80, "< Back", { font: `${vars.fontMid}px monospace`, fill: "#67f" })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerup', () => this.scene.start('LobbyScene'));
  }
}

class LeaderboardScene extends Phaser.Scene {
  constructor() { super('LeaderboardScene'); }
  async create() {
    const vars = getScaleVars(this);
    this.add.rectangle(vars.w/2, vars.h/2, vars.w, vars.h, 0x000000, 0.93);
    this.add.text(vars.w/2, vars.h*0.11, "Leaderboard", { font: `${vars.fontBig}px monospace`, fill: "#ffe349" }).setOrigin(0.5,0);

    const leaders = await fetchLeaderboard();
    let y = vars.h*0.17;
    leaders.forEach((u, i) => {
      this.add.text(vars.w/2, y + i * (vars.fontSmall+16), `${i + 1}. ${u.username || "Anon"} - ${u.total_score} pts`, { font: `${vars.fontSmall+4}px monospace`, fill: "#fff" }).setOrigin(0.5,0);
    });

    this.add.text(vars.w/2, vars.h - 80, "< Back", { font: `${vars.fontMid}px monospace`, fill: "#67f" })
      .setOrigin(0.5)
      .setInteractive()
      .on('pointerup', () => this.scene.start('LobbyScene'));
  }
}

function showSmoke(scene, x, y) {
   let smoke = scene.add.sprite(x, y, 'smoke_anim').setScale(1.1).setAlpha(0.85);
    smoke.play('smoke_play');
    smoke.on('animationcomplete', () => smoke.destroy());
}

// --- Phaser Başlat ---
const gameWidth = window.innerWidth;
const gameHeight = window.innerHeight;
const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: gameWidth,
    height: gameHeight,
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
 
