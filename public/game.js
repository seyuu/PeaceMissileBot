// --- TELEGRAM MINI APPS ANALYTICS SDK ENTEGRASYONU ---
(function () {
  var s = document.createElement('script');
  s.src = "https://cdn.jsdelivr.net/npm/@tma.js/analytics@latest";
  s.onload = function() {
    tma.analytics.init({
      botUsername: 'PMNOFOGameBot', 
      accessToken: 'eyJhcHBfbmFtZSI6IlBlYWNlTWlzc2lsZUdhbWUiLCJhcHBfdXJsIjoiaHR0cHM6Ly90Lm1lL1BNTk9GT0dhbWVCb3QiLCJhcHBfZG9tYWluIjoiaHR0cHM6Ly9wZWFjZW1pc3NpbGUtZ2FtZS11aS5vbnJlbmRlci5jb20vIn0=!ZMoot1peRfJVWVWuIjRF8B22OYVWYJgNHqLT6TlOrc8=' 
    });
    tma.analytics.send('app_open');
  };
  document.head.appendChild(s);
})();

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

    // BG tam ekran
    this.add.image(vars.w/2, vars.h/2, 'lobby_bg').setDisplaySize(vars.w, vars.h);
    

    // Score & Coin ikonları (sağ üstte örnek)
    this.add.image(vars.w - 50, 45, 'score_icon').setScale(1.6);
    //this.add.image(vars.w - 50, 90, 'coin_icon').setScale(0.6);
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
    this.add.image(vars.w/2, vars.h - 95, 'logo').setScale(vars.logoScale/2);
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

class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    preload() {
        this.load.image('iran_bg', assets.iran_bg);
        this.load.image('israel_bg', assets.israel_bg);
        this.load.image('lobby_bg', assets.lobby_bg);
        this.load.image('logo', assets.logo);
        this.load.image('destroyed_building', assets.destroyed_building);
        this.load.image('rocket', assets.rocket);
        this.load.image('dove', assets.dove);
        this.load.image('coin_icon', assets.coin);
        this.load.image('score_icon', assets.score_icon);
        this.load.image('button', assets.button);
        this.load.image('building_bar', assets.building_bar);
        this.load.spritesheet('explosion', assets.explosion, { frameWidth: 64, frameHeight: 64 });
        this.load.spritesheet('smoke', assets.smoke, { frameWidth: 128, frameHeight: 128});
    }
    create() {
        this.scene.start('LobbyScene');
    }
}


// --- Oyun ---
const POWERUP_TYPES = ["extra_dove", "double_score", "slow_rockets", "freeze"];

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }

    create(data) {
        // --- Temel ayarlar ---
        let side = data.side || "israel";
        this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, side === "iran_bg" ? "iran_bg" : "israel_bg")
            .setDisplaySize(this.cameras.main.width, this.cameras.main.height);

        // Binalar
        this.buildings = [];
        let bArr = buildingData[side];
        for (let b of bArr) {
            let building = this.add.rectangle(b.x, b.y, 50, 60, 0xffffff, 0.01);
            building.health = BUILDING_HEALTH;
            building.side = side;
            building.alive = true;
            building.setInteractive();
            this.buildings.push(building);
            building.healthBar = this.add.graphics();
            this.updateHealthBar(building);
        }

        // Skor & puan
        this.score = 0;
        this.scoreText = this.add.text(30, 20, "Score: 0", { font: '24px monospace', color: "#fff" });

        // Dinamik zorluk
        this.rocketCount = 0;
        this.bombSpawnDelay = 1100;
        this.bombSpeedMultiplier = 1;
        this.doubleScoreActive = false;

        // Zorluk seviyeleri
        this.difficultyLevels = [
            { count: 0,   delay: 1100, speed: 1.00 },
            { count: 20,  delay: 950,  speed: 1.15 },
            { count: 50,  delay: 800,  speed: 1.30 },
            { count: 100, delay: 650,  speed: 1.50 },
            { count: 150, delay: 500,  speed: 1.80 },
            { count: 200, delay: 390,  speed: 2.10 }
        ];

        // Dinamik puan tablosu
        this.scoreTable = [
            { max: 20,  min: 7, maxP: 10 },
            { max: 70,  min: 5, maxP: 8 },
            { max: 999, min: 3, maxP: 6 }
        ];

        // Günlük görev (localStorage)
        this.today = new Date().toISOString().slice(0, 10);
        this.localMissions = JSON.parse(localStorage.getItem("missions") || "{}");
        if (!this.localMissions[this.today]) {
            this.localMissions[this.today] = { rockets: 0, claimed: false };
        }
        this.hourlyPlayCount = parseInt(localStorage.getItem("hourlyPlayCount") || "0");
        this.lastPlayHour = parseInt(localStorage.getItem("lastPlayHour") || "0");


        // Saatlik limit kontrolü
        let nowHour = new Date().getHours();
        if (this.lastPlayHour !== nowHour) {
            this.hourlyPlayCount = 0;
            localStorage.setItem("hourlyPlayCount", "0");
            localStorage.setItem("lastPlayHour", nowHour.toString());
        }

        // Power-up timer
        this.time.addEvent({
            delay: Phaser.Math.Between(30000, 60000),
            callback: () => this.spawnPowerUp(),
            callbackScope: this,
            loop: true
        });

        // Oyun timer
        this.startBombTimer();

        // Oyun bitti mi?
        this.gameOver = false;
    }

    // --- Power-up spawn ---
    spawnPowerUp() {
        let type = Phaser.Utils.Array.GetRandom(POWERUP_TYPES);
        let x = Phaser.Math.Between(60, this.cameras.main.width - 60);
        let y = Phaser.Math.Between(70, this.cameras.main.height - 150);
        let spriteKey = type === "extra_dove" ? 'dove' : 'coin_icon';
        let pu = this.physics.add.sprite(x, y, spriteKey).setScale(0.6).setInteractive();

        pu.on('pointerdown', () => {
            this.activatePowerUp(type);
            pu.destroy();
        });
        this.time.delayedCall(8000, () => pu.destroy());
    }

    // --- Power-up etkileri ---
    activatePowerUp(type) {
        if (type === "double_score") {
            this.doubleScoreActive = true;
            this.time.delayedCall(10000, () => this.doubleScoreActive = false);
        }
        if (type === "slow_rockets") {
            this.bombSpeedMultiplier *= 0.6;
            this.time.delayedCall(7000, () => this.adjustDifficulty());
        }
        if (type === "freeze") {
            this.bombTimer.paused = true;
            this.time.delayedCall(4000, () => this.bombTimer.paused = false);
        }
        if (type === "extra_dove") {
            for(let i=0; i<3; i++) this.spawnBomb();
        }
    }

    // --- Günlük görev kontrol ---
    onRocketConverted() {
        // Görev artır
        this.localMissions[this.today].rockets += 1;
        localStorage.setItem("missions", JSON.stringify(this.localMissions));
        // Ödül animasyonu
        if (!this.localMissions[this.today].claimed && this.localMissions[this.today].rockets >= 100) {
            this.localMissions[this.today].claimed = true;
            localStorage.setItem("missions", JSON.stringify(this.localMissions));
            this.showDailyMissionReward();
        }
    }

    showDailyMissionReward() {
        // Basit animasyon veya popup
        let r = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, "Günlük Görev Başarıldı!\n+50 Coin!", {
            font: "28px monospace",
            fill: "#ff0",
            align: "center",
            backgroundColor: "#222",
            padding: 16
        }).setOrigin(0.5);
        this.time.delayedCall(2200, () => r.destroy());
        // Coin ödülü için ekleme kodu senin coin logicine bağlı
    }

    // --- Bomb timer başlat ---
    startBombTimer() {
        this.bombTimer = this.time.addEvent({
            delay: this.bombSpawnDelay,
            callback: () => {
                if (this.gameOver) return;
                // Saatlik limit ve captcha kontrolü
                this.hourlyPlayCount += 1;
                localStorage.setItem("hourlyPlayCount", this.hourlyPlayCount.toString());
              
                this.rocketCount++;
                this.adjustDifficulty();
                this.spawnBomb();
                // Timer delay’ini güncelle!
                this.bombTimer.reset({
                    delay: this.bombSpawnDelay,
                    callback: this.bombTimer.callback,
                    callbackScope: this
                });
            },
            callbackScope: this,
            loop: true
        });
    }

 

    // --- Zorluk seviyesini güncelle ---
    adjustDifficulty() {
        for (let i = this.difficultyLevels.length - 1; i >= 0; i--) {
            if (this.rocketCount >= this.difficultyLevels[i].count) {
                this.bombSpawnDelay = this.difficultyLevels[i].delay;
                this.bombSpeedMultiplier = this.difficultyLevels[i].speed;
                break;
            }
        }
    }

    // --- Dinamik puan hesapla ---
    getDynamicScore(rocketIndex) {
        for (let i = 0; i < this.scoreTable.length; i++) {
            if (rocketIndex <= this.scoreTable[i].max) {
                return Phaser.Math.Between(this.scoreTable[i].min, this.scoreTable[i].maxP);
            }
        }
        return 3;
    }

    // --- Bombaları spawnla (güncellenmiş spawn algoritması) ---
    spawnBomb() {
        if (this.gameOver) return;

        let liveBuildings = this.buildings.filter(b => b.alive);
        if (liveBuildings.length === 0) return;
        let target = Phaser.Utils.Array.GetRandom(liveBuildings);

        let fromSide = Math.random() < 0.25;
        let x, y, vx, vy;

        if (!fromSide) {
            x = target.x;
            y = -60;
            vx = 0;
            vy = Phaser.Math.Between(170, 240) * this.bombSpeedMultiplier;
        } else {
            let sideLeft = Math.random() < 0.5;
            let offsetY = Phaser.Math.Between(100, 180);
            if (sideLeft) {
                x = -40;
                y = Math.max(target.y - offsetY, 30);
                vx = Phaser.Math.Between(150, 230) * this.bombSpeedMultiplier;
                vy = Phaser.Math.Between(100, 200) * this.bombSpeedMultiplier;
            } else {
                x = this.cameras.main.width + 40;
                y = Math.max(target.y - offsetY, 30);
                vx = -Phaser.Math.Between(150, 230) * this.bombSpeedMultiplier;
                vy = Phaser.Math.Between(100, 200) * this.bombSpeedMultiplier;
            }
        }

        let bomb = this.physics.add.sprite(x, y, 'rocket');
        bomb.setDisplaySize(32, 50);
        bomb.target = target;
        bomb.setInteractive();
        bomb.vx = vx / 1000;
        bomb.vy = vy / 1000;
        this.bombs = this.bombs || [];
        this.bombs.push(bomb);
        bomb.rotation = Math.atan2(bomb.vy, bomb.vx) + Math.PI / 2;

        bomb.on('pointerdown', () => {
            this.bombExplode(bomb, false);
        });
    }

    // --- Oyun döngüsü ---
    update(time, delta) {
        if (this.gameOver) return;
        if (this.bombs) {
            for (let bomb of this.bombs) {
                if (!bomb.active) continue;
                bomb.x += bomb.vx * delta;
                bomb.y += bomb.vy * delta;
                let b = bomb.target;
                if (b && b.alive && Phaser.Geom.Rectangle.Contains(b.getBounds(), bomb.x, bomb.y)) {
                    this.bombExplode(bomb, true);
                }
                if (bomb.y > this.cameras.main.height + 60 || bomb.x < -40 || bomb.x > this.cameras.main.width + 40) {
                    bomb.destroy();
                }
            }
            this.bombs = this.bombs.filter(b => b.active);
        }
        for (let b of this.buildings) {
            this.updateHealthBar(b);
        }
    }

    // --- Bombanın patlama mantığı (puan, görev, power-up, meme!) ---
    bombExplode(bomb, isHitBuilding) {
        if (!bomb.active) return;
        let exp = this.add.sprite(bomb.x, bomb.y, 'explosion').setScale(0.8);
        this.time.delayedCall(400, () => exp.destroy());

        if (!isHitBuilding) {
            let dove = this.add.image(bomb.x, bomb.y, 'dove').setScale(0.35);
            this.tweens.add({
                targets: dove, y: dove.y - 80, alpha: 0,
                duration: 700, onComplete: () => dove.destroy()
            });

            let dynamicScore = this.getDynamicScore(this.rocketCount);
            if (this.doubleScoreActive) dynamicScore *= 2;
            this.score += dynamicScore;
            this.scoreText.setText(`Score: ${this.score}`);

            this.onRocketConverted();

            // Meme çıkart
            if (this.rocketCount > 0 && this.rocketCount % 15 === 0) {
                this.showRandomMeme();
            }
        }

        if (isHitBuilding && bomb.target) {
            let b = bomb.target;
            if (b.alive) {
                b.health -= 1;
                if (b.health <= 0) {
                    b.alive = false;
                    let des = this.add.image(b.x, b.y + 15, 'destroyed_building').setDisplaySize(90, 100);
                    let smoke = this.add.sprite(b.x, b.y - 10, 'smoke').setScale(0.7);
                    this.time.delayedCall(900, () => smoke.destroy());
                    showSmoke(this, b.x, b.y - 20);
                }
                if (this.buildings.filter(bb => bb.alive).length === 0) {
                    this.gameOver = true;
                    let coinEarned = Math.floor(this.score / 10);
                    this.scene.start('GameOverScene', { score: this.score, coins: coinEarned });
                }
            }
        }
        bomb.destroy();
    }

    // --- Sağlık barı ---
    updateHealthBar(building) {
        if (!building.healthBar) return;
        building.healthBar.clear();
        if (!building.alive) return;
        let w = 38, h = 7;
        building.healthBar.fillStyle(0x008800, 0.7);
        building.healthBar.fillRect(building.x - w / 2, building.y - 36, w * (building.health / BUILDING_HEALTH), h);
        building.healthBar.lineStyle(1, 0xffffff, 1);
        building.healthBar.strokeRect(building.x - w / 2, building.y - 36, w, h);
    }

    // --- Random meme veya Barış Abi mesajı (örnek) ---
    showRandomMeme() {
        let memes = [
            "Güvercin: 'Barışa bir adım daha!'",
            "Barış Abi: 'Evlat, harika gidiyorsun!'",
            "Bir meme görseli ya da komik cümle burada çıkabilir.",
            "Barış Tweet'i: Cik cik barış, roket yok savaş!"
        ];
        let memeText = Phaser.Utils.Array.GetRandom(memes);
        let t = this.add.text(this.cameras.main.centerX, 120, memeText, {
            font: "bold 22px monospace",
            fill: "#fff",
            backgroundColor: "#333",
            align: "center",
            padding: 10
        }).setOrigin(0.5);
        this.time.delayedCall(1900, () => t.destroy());
    }
}

// --- GameOver Scene ---
class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }
    async create(data) {
        this.cameras.main.setBackgroundColor("#222");
        this.add.text(this.cameras.main.centerX, 200, "Game Over!", { font: '36px monospace', color: "#fff" }).setOrigin(0.5);
        this.add.text(this.cameras.main.centerX, 250, `Score: ${data.score}`, { font: '28px monospace', color: "#ffd" }).setOrigin(0.5);
        this.add.text(this.cameras.main.centerX, 290, `PMNOFO Coin: ${data.coins}`, { font: '24px monospace', color: "#3f6" }).setOrigin(0.5);

        sendScoreToBot(data.score); // veya data.coins göndereceksen onu da ekle!

        const retryBtn = this.add.text(this.cameras.main.centerX, 360, "Play Again", { font: '24px monospace', color: "#1df", backgroundColor: "#133" })
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
    this.add.text(vars.w/2, vars.h*0.1, "Amaç ve Kuralar", { font: `${vars.fontBig}px monospace`, fill: "#fff" }).setOrigin(0.5);
    let msg = "🕊️ Barış Füzesine Hoş Geldiniz! 🕊️\n\n"+
        "Füzeleri barış güvercinlerine çevir,\n\n"+" dünyaya barış getir. \n\n"+
        "Her dönüşüm puan kazandırır.\n\n"+
        "💰 PMNOFO Coin Kazan\n"+
        "Kazandığın puan kadar coin alırsın.\n\n"+
        "Yeni rekor kırarsan, rekorunun \n\n"+"100 katı bonus coin kazanırsın.\n\n"+
        "Lideri geçersen, \n\n"+"puanının 250 katı coin kazanırsın!\n\n"+
        "📊 Liderlik Tablosu\n"+
        "En iyi oyuncuları görmek için  \n\n"+
        "`/leaderboard` komutunu kullanın. \n\n"+ 
        "📢 Unutma \n\n"+"Her puan, barış için bir adım! \n\n"+
        "Haydi, göreve başlayın!";
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
   let smoke = scene.add.image(x, y, 'destroyed_building').setScale(0.17).setAlpha(0.93);
    scene.tweens.add({
        targets: smoke,
        y: y - 25,
        scale: 0.23,
        alpha: 0,
        duration: 1700,
        onComplete: () => smoke.destroy()
    });
}


function sendScoreToBot(score) {
    const user = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe.user;
    fetch('https://peacebot-641906716058.europe-central2.run.app/save_score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: user && user.id ? String(user.id) : "anon",
        username: user && user.username ? user.username : "Player",
        score: score
      })
    })
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
    scene: [BootScene, LobbyScene, SideSelectScene, GameScene, GameOverScene, HowToPlayScene, LeaderboardScene],
    physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);
