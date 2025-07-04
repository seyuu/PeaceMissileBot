// --- TELEGRAM MINI APPS ANALYTICS SDK ENTEGRASYONU ---
(function () {
  try {
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
  } catch(e) { console.error("TMA Analytics failed to load", e); }
})();

// --- Telegram & Firestore Setup ---
const tg = window.Telegram.WebApp;

// --- Firebase Config ---
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

// --- Global Değişkenler ---
let userStats = { username: "Player", score: 0, total_score: 0, total_pmno_coins: 0 };

async function fetchUserStats() {
    if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) {
        console.log("Kullanıcı bilgisi alınamadı.");
        return;
    }
    const userId = String(tg.initDataUnsafe.user.id);
    const ref = db.collection("users").doc(userId);
    try {
        const snap = await ref.get();
        if (snap.exists) {
            userStats = snap.data();
            console.log("Kullanıcı verisi başarıyla çekildi:", userStats);
        } else {
            console.log("Kullanıcı veritabanında bulunamadı.");
        }
    } catch (error) {
        console.error("Kullanıcı verisi çekilirken hata:", error);
    }
}

async function fetchLeaderboard() {
  try {
    const snap = await db.collection("users").orderBy("total_score", "desc").limit(5).get();
    return snap.docs.map(doc => doc.data());
  } catch (error) {
    console.error("Liderlik tablosu çekilirken hata:", error);
    return [];
  }
}

// --- Diğer Oyun Sabitleri ---
const MEME_MESSAGES = [ { text: "Dove: 'One more step for peace!'", img: "dove_peace" }, { text: "Peace Bro: 'Kid, you rock!'", img: "peace_bro" }, { text: "Missile turned into a dove. Classic!", img: "missile_to_dove" }, { text: "Tweet tweet! Bombs out, peace in!", img: "twitter_bird" }, { text: "Everyone for peace!", img: "crowd_peace" } ];
const buildingData = { iran: [ { x: 100, y: 400 }, { x: 170, y: 410 }, { x: 260, y: 410 }, { x: 60, y: 470 }, { x: 140, y: 520 }, { x: 260, y: 520 }, { x: 320, y: 470 }, { x: 320, y: 560 }, { x: 100, y: 580 }, { x: 250, y: 620 } ], israel: [ { x: 120, y: 480 }, { x: 210, y: 430 }, { x: 270, y: 480 }, { x: 80, y: 550 }, { x: 170, y: 530 }, { x: 250, y: 550 }, { x: 320, y: 540 }, { x: 360, y: 600 }, { x: 120, y: 640 }, { x: 230, y: 670 } ] };
const BUILDING_HEALTH = 2;
const assets = { iran_bg: 'assets/iran_bg.jpg', israel_bg: 'assets/israel_bg.jpg', lobby_bg: 'assets/lobby_bg.png', logo: 'assets/logo.png', destroyed_building: 'assets/destroyed_building.png', rocket: 'assets/rocket.png', explosion: 'assets/explosion.gif', dove: 'assets/dove.png', coin: 'assets/coin_icon.png', score_icon: 'assets/score_icon.png', button:'assets/play_button.png', building_bar:'assets/score.png', smoke: 'assets/smoke_sheet.png', dove_peace: 'assets/dove_peace.png', peace_bro: 'assets/peace_bro.png', missile_to_dove: 'assets/missile_to_dove.png', twitter_bird: 'assets/twitter_bird.png', crowd_peace: 'assets/crowd_peace.png', };
const POWERUP_TYPES = ["extra_dove", "double_score", "slow_rockets", "freeze"];

// --- Helper Fonksiyonlar ---
function getScaleVars(scene) {
  const w = scene.cameras.main.width;
  const h = scene.cameras.main.height;
  return { w, h, fontBig: Math.max(Math.round(w/20), 18), fontMid: Math.max(Math.round(w/25), 15), fontSmall: Math.max(Math.round(w/32), 12), btnScale: Math.max(w/1400, 0.33), logoScale: Math.max(w/700, 0.21), topPanelW: Math.min(w * 0.55, 330), margin: Math.max(w/48, 10) };
}

function showSmoke(scene, x, y) {
   let smoke = scene.add.image(x, y, 'destroyed_building').setScale(0.17).setAlpha(0.93);
    scene.tweens.add({ targets: smoke, y: y - 25, scale: 0.23, alpha: 0, duration: 1700, onComplete: () => smoke.destroy() });
}

// --- OYUN SAHNELERİ (TAM VE EKSİKSİZ) ---

class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }
    preload() {
        console.log("BootScene: Preloading assets...");
        Object.keys(assets).forEach(key => {
            if (key === 'explosion') this.load.spritesheet(key, assets[key], { frameWidth: 64, frameHeight: 64 });
            else if (key === 'smoke') this.load.spritesheet(key, assets[key], { frameWidth: 128, frameHeight: 128 });
            else this.load.image(key, assets[key]);
        });
    }
    create() {
        console.log("BootScene: Assets loaded, starting LobbyScene.");
        this.scene.start('LobbyScene');
    }
}

class LobbyScene extends Phaser.Scene {
    constructor() { super('LobbyScene'); }
    async create() {
        console.log("LobbyScene: Creating scene...");
        const { width, height } = this.scale;
        const margin = width * 0.05;
        const statColor = "#ffe349";
        const smallFontSize = Math.min(width * 0.03, 20);
        const welcomeFontSize = smallFontSize + 2;

        const bg = this.add.image(width / 2, 0, 'lobby_bg').setOrigin(0.5, 0);
        bg.setScale(width / bg.width);

        const statsX = width - margin;
        let statsY = height * 0.05;
        this.usernameText = this.add.text(statsX, statsY, `Welcome, ...`, { font: `${welcomeFontSize}px monospace`, fill: "#fff", align: 'right' }).setOrigin(1, 0);
        statsY += welcomeFontSize + 12;
        this.maxScoreText = this.add.text(statsX, statsY, `Max Score: ...`, { font: `${smallFontSize}px monospace`, fill: statColor, align: 'right' }).setOrigin(1, 0);
        statsY += smallFontSize + 9;
        this.totalScoreText = this.add.text(statsX, statsY, `Total Score: ...`, { font: `${smallFontSize}px monospace`, fill: statColor, align: 'right' }).setOrigin(1, 0);
        statsY += smallFontSize + 9;
        this.coinsText = this.add.text(statsX, statsY, `PMNOFO Coins: ...`, { font: `${smallFontSize}px monospace`, fill: statColor, align: 'right' }).setOrigin(1, 0);

        const startBtn = this.add.image(width / 2, height * 0.58, 'button').setInteractive({ cursor: 'pointer' });
        startBtn.setScale(width * 0.0015);
        startBtn.on('pointerup', () => this.scene.start('SideSelectScene'));

        const logoY = startBtn.y - startBtn.displayHeight / 2 - (height * 0.06);
        this.add.image(width / 2, logoY, 'logo').setScale(width * 0.001);

        const menuY = startBtn.y + startBtn.displayHeight / 2 + (height * 0.04);
        const menuFontSize = Math.min(width * 0.035, 24);
        this.add.text(width * 0.25, menuY, "Leaderboard", { font: `${menuFontSize}px monospace`, fill: "#ffe349" }).setOrigin(0.5, 0).setInteractive({ cursor: 'pointer' }).on('pointerup', () => this.scene.start('LeaderboardScene'));
        this.add.text(width * 0.75, menuY, "How to Play?", { font: `${menuFontSize}px monospace`, fill: "#43c0f7" }).setOrigin(0.5, 0).setInteractive({ cursor: 'pointer' }).on('pointerup', () => this.scene.start('HowToPlayScene'));

        const leaderboardY = height - (height * 0.18);
        const midFontSize = Math.min(width * 0.04, 28);
        this.add.text(width / 2, leaderboardY, "Top Players", { font: `bold ${midFontSize}px monospace`, fill: "#ffe349" }).setOrigin(0.5, 0);

        await fetchUserStats();
        this.usernameText.setText(`Welcome, ${userStats.username || 'Player'}!`);
        this.maxScoreText.setText(`Max Score: ${userStats.score || 0}`);
        this.totalScoreText.setText(`Total Score: ${userStats.total_score || 0}`);
        this.coinsText.setText(`PMNOFO Coins: ${userStats.total_pmno_coins || 0}`);

        const leaders = await fetchLeaderboard();
        let leaderYPos = leaderboardY + midFontSize + 10;
        leaders.slice(0, 3).forEach((u, i) => {
            this.add.text(width / 2, leaderYPos + i * (smallFontSize + 8), `${i + 1}. ${u.username || 'Anon'} - ${u.total_score} pts`, { font: `${smallFontSize}px monospace`, fill: "#fff" }).setOrigin(0.5, 0);
        });
    }
}

class SideSelectScene extends Phaser.Scene {
    constructor() { super({ key: 'SideSelectScene' }); }
    create() {
        this.cameras.main.setBackgroundColor("#000");
        this.add.text(this.cameras.main.centerX, 120, "Choose your side", { font: '32px monospace', color: "#fff" }).setOrigin(0.5);
        let iranImg = this.add.image(this.cameras.main.centerX - 100, 250, 'iran_bg').setDisplaySize(120, 160).setInteractive();
        this.add.text(this.cameras.main.centerX - 100, 335, "Defend Iran", { font: '20px monospace', color: "#fff" }).setOrigin(0.5, 0);
        let isrImg = this.add.image(this.cameras.main.centerX + 100, 250, 'israel_bg').setDisplaySize(120, 160).setInteractive();
        this.add.text(this.cameras.main.centerX + 100, 335, "Defend Israel", { font: '20px monospace', color: "#fff" }).setOrigin(0.5, 0);
        iranImg.on('pointerdown', () => { this.scene.start('GameScene', { side: 'iran' }); });
        isrImg.on('pointerdown', () => { this.scene.start('GameScene', { side: 'israel' }); });
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    create(data) {
        let side = data && data.side ? data.side : "israel";
        this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, side === "iran" ? "iran_bg" : "israel_bg").setDisplaySize(this.cameras.main.width, this.cameras.main.height);
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
        this.score = 0;
        this.scoreText = this.add.text(30, 20, "Score: 0", { font: '24px monospace', color: "#fff" });
        this.rocketCount = 0;
        this.bombSpawnDelay = 1100;
        this.bombSpeedMultiplier = 1;
        this.doubleScoreActive = false;
        this.nextMemeAt = Phaser.Math.Between(8, 12);
        this.difficultyLevels = [ { count: 0, delay: 1100, speed: 1.00 }, { count: 20, delay: 950, speed: 1.15 }, { count: 50, delay: 800, speed: 1.30 }, { count: 100, delay: 650, speed: 1.50 }, { count: 150, delay: 500, speed: 1.80 }, { count: 200, delay: 390, speed: 2.10 } ];
        this.scoreTable = [ { max: 20, min: 7, maxP: 10 }, { max: 70, min: 5, maxP: 8 }, { max: 999, min: 3, maxP: 6 } ];
        this.today = new Date().toISOString().slice(0, 10);
        this.localMissions = JSON.parse(localStorage.getItem("missions") || "{}");
        if (!this.localMissions[this.today]) { this.localMissions[this.today] = { rockets: 0, claimed: false }; }
        this.hourlyPlayCount = parseInt(localStorage.getItem("hourlyPlayCount") || "0");
        this.lastPlayHour = parseInt(localStorage.getItem("lastPlayHour") || "0");
        let nowHour = new Date().getHours();
        if (this.lastPlayHour !== nowHour) { this.hourlyPlayCount = 0; localStorage.setItem("hourlyPlayCount", "0"); localStorage.setItem("lastPlayHour", nowHour.toString()); }
        this.time.addEvent({ delay: Phaser.Math.Between(30000, 60000), callback: () => this.spawnPowerUp(), callbackScope: this, loop: true });
        this.startBombTimer();
        this.gameOver = false;
    }
    spawnPowerUp() {
        let type = Phaser.Utils.Array.GetRandom(POWERUP_TYPES);
        let x = Phaser.Math.Between(60, this.cameras.main.width - 60);
        let y = Phaser.Math.Between(70, this.cameras.main.height - 150);
        let spriteKey = type === "extra_dove" ? 'dove' : 'coin_icon';
        let pu = this.physics.add.sprite(x, y, spriteKey).setScale(0.6).setInteractive();
        pu.on('pointerdown', () => { this.activatePowerUp(type); pu.destroy(); });
        this.time.delayedCall(8000, () => pu.destroy());
    }
    activatePowerUp(type) {
        if (type === "double_score") { this.doubleScoreActive = true; this.time.delayedCall(10000, () => this.doubleScoreActive = false); }
        if (type === "slow_rockets") { this.bombSpeedMultiplier *= 0.6; this.time.delayedCall(7000, () => this.adjustDifficulty()); }
        if (type === "freeze") { this.bombTimer.paused = true; this.time.delayedCall(4000, () => this.bombTimer.paused = false); }
        if (type === "extra_dove") { for(let i=0; i<3; i++) this.spawnBomb(); }
    }
    onRocketConverted() {
        this.localMissions[this.today].rockets += 1;
        localStorage.setItem("missions", JSON.stringify(this.localMissions));
        if (!this.localMissions[this.today].claimed && this.localMissions[this.today].rockets >= 100) {
            this.localMissions[this.today].claimed = true;
            localStorage.setItem("missions", JSON.stringify(this.localMissions));
            this.showDailyMissionReward();
        }
    }
    showDailyMissionReward() {
        let r = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, "Günlük Görev Başarıldı!\n+50 Coin!", { font: "28px monospace", fill: "#ff0", align: "center", backgroundColor: "#222", padding: 16 }).setOrigin(0.5);
        this.time.delayedCall(2200, () => r.destroy());
    }
    startBombTimer() {
        this.bombTimer = this.time.addEvent({
            delay: this.bombSpawnDelay,
            callback: () => {
                if (this.gameOver) return;
                this.hourlyPlayCount += 1;
                localStorage.setItem("hourlyPlayCount", this.hourlyPlayCount.toString());
                this.rocketCount++;
                this.adjustDifficulty();
                this.spawnBomb();
                this.bombTimer.reset({ delay: this.bombSpawnDelay, callback: this.bombTimer.callback, callbackScope: this });
            },
            callbackScope: this,
            loop: true
        });
    }
    adjustDifficulty() {
        for (let i = this.difficultyLevels.length - 1; i >= 0; i--) {
            if (this.rocketCount >= this.difficultyLevels[i].count) {
                this.bombSpawnDelay = this.difficultyLevels[i].delay;
                this.bombSpeedMultiplier = this.difficultyLevels[i].speed;
                break;
            }
        }
    }
    getDynamicScore(rocketIndex) {
        for (let i = 0; i < this.scoreTable.length; i++) { if (rocketIndex <= this.scoreTable[i].max) { return Phaser.Math.Between(this.scoreTable[i].min, this.scoreTable[i].maxP); } }
        return 3;
    }
    spawnBomb() {
        if (this.gameOver) return;
        let liveBuildings = this.buildings.filter(b => b.alive);
        if (liveBuildings.length === 0) return;
        let target = Phaser.Utils.Array.GetRandom(liveBuildings);
        let fromSide = Math.random() < 0.25;
        let x, y, vx, vy;
        if (!fromSide) { x = target.x; y = -60; vx = 0; vy = Phaser.Math.Between(170, 240) * this.bombSpeedMultiplier; }
        else {
            let sideLeft = Math.random() < 0.5;
            let offsetY = Phaser.Math.Between(100, 180);
            if (sideLeft) { x = -40; y = Math.max(target.y - offsetY, 30); vx = Phaser.Math.Between(150, 230) * this.bombSpeedMultiplier; vy = Phaser.Math.Between(100, 200) * this.bombSpeedMultiplier; }
            else { x = this.cameras.main.width + 40; y = Math.max(target.y - offsetY, 30); vx = -Phaser.Math.Between(150, 230) * this.bombSpeedMultiplier; vy = Phaser.Math.Between(100, 200) * this.bombSpeedMultiplier; }
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
        bomb.on('pointerdown', () => { this.bombExplode(bomb, false); });
    }
    update(time, delta) {
        if (this.gameOver) return;
        if (this.bombs) {
            for (let bomb of this.bombs) {
                if (!bomb.active) continue;
                bomb.x += bomb.vx * delta;
                bomb.y += bomb.vy * delta;
                let b = bomb.target;
                if (b && b.alive && Phaser.Geom.Rectangle.Contains(b.getBounds(), bomb.x, bomb.y)) { this.bombExplode(bomb, true); }
                if (bomb.y > this.cameras.main.height + 60 || bomb.x < -40 || bomb.x > this.cameras.main.width + 40) { bomb.destroy(); }
            }
            this.bombs = this.bombs.filter(b => b.active);
        }
        for (let b of this.buildings) { this.updateHealthBar(b); }
    }
    bombExplode(bomb, isHitBuilding) {
        if (!bomb.active) return;
        let exp = this.add.sprite(bomb.x, bomb.y, 'explosion').setScale(0.8);
        this.time.delayedCall(400, () => exp.destroy());
        if (!isHitBuilding) {
            let dove = this.add.image(bomb.x, bomb.y, 'dove').setScale(0.35);
            this.tweens.add({ targets: dove, y: dove.y - 80, alpha: 0, duration: 700, onComplete: () => dove.destroy() });
            let dynamicScore = this.getDynamicScore(this.rocketCount);
            if (this.doubleScoreActive) dynamicScore *= 2;
            this.score += dynamicScore;
            this.scoreText.setText(`Score: ${this.score}`);
            this.onRocketConverted();
            if (this.rocketCount >= this.nextMemeAt) { this.showRandomMeme(); this.nextMemeAt = this.rocketCount + Phaser.Math.Between(8, 12); }
        }
        if (isHitBuilding && bomb.target) {
            let b = bomb.target;
            if (b.alive) {
                b.health -= 1;
                if (b.health <= 0) {
                    b.alive = false;
                    this.add.image(b.x, b.y + 15, 'destroyed_building').setDisplaySize(90, 100);
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
    showRandomMeme() {
      const meme = Phaser.Utils.Array.GetRandom(MEME_MESSAGES);
      const cx = this.cameras.main.centerX;
      const img = this.add.image(cx, 60, meme.img).setScale(0.7).setOrigin(0.5, 0);
      const txt = this.add.text(cx, img.y + img.displayHeight + 8, meme.text, { font: "18px monospace", fill: "#fff", backgroundColor: "#1a1a1ac9", align: "center", padding: { left: 8, right: 8, top: 2, bottom: 2 }, wordWrap: { width: 260 } }).setOrigin(0.5, 0);
      this.time.delayedCall(2300, () => { img.destroy(); txt.destroy(); });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }
    create(data) {
        this.cameras.main.setBackgroundColor("#222");
        this.add.text(this.cameras.main.centerX, 200, "Game Over!", { font: '36px monospace', color: "#fff" }).setOrigin(0.5);
        this.add.text(this.cameras.main.centerX, 250, `Score: ${data.score}`, { font: '28px monospace', color: "#ffd" }).setOrigin(0.5);
        this.add.text(this.cameras.main.centerX, 290, `PMNOFO Coin: ${data.coins}`, { font: '24px monospace', color: "#3f6" }).setOrigin(0.5);
        sendScoreToBot(data.score);
        const retryBtn = this.add.text(this.cameras.main.centerX, 360, "Play Again", { font: '24px monospace', color: "#1df", backgroundColor: "#133" }).setOrigin(0.5).setPadding(10).setInteractive();
        retryBtn.on('pointerdown', () => { this.scene.start('LobbyScene'); });
    }
}

class HowToPlayScene extends Phaser.Scene {
  constructor() { super('HowToPlayScene'); }
  create() {
    const vars = getScaleVars(this);
    this.add.rectangle(vars.w/2, vars.h/2, vars.w, vars.h, 0x000000, 0.96);
    this.add.text(vars.w/2, vars.h*0.1, "Amaç ve Kuralar", { font: `${vars.fontBig}px monospace`, fill: "#fff" }).setOrigin(0.5);
    let msg = "🕊️ Welcome to Peace Missile! 🕊️\n\nTurn missiles into doves\n\nand bring peace to the world.\n\nEach conversion earns you points.\n\n💰 Earn PMNOFO Coins\nYou get coins equal to your score.\n\nBreak your own record to win\n\na bonus of 100x your high score!\n\nIf you beat the leader,\n\nearn 250x your score in coins!\n\n📊 Leaderboard\nUse the `/leaderboard` command to see\n\nthe top players.\n\n📢 Remember\n\nEvery point is a step for peace!\n\nStart your mission now!";
    this.add.text(vars.w/2, vars.h*0.17, msg, { font: `${vars.fontSmall+3}px monospace`, fill: "#fff", align: "center" }).setOrigin(0.5,0);
    this.add.text(vars.w/2, vars.h - 80, "< Back", { font: `${vars.fontMid}px monospace`, fill: "#67f" }).setOrigin(0.5).setInteractive().on('pointerup', () => this.scene.start('LobbyScene'));
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
    this.add.text(vars.w/2, vars.h - 80, "< Back", { font: `${vars.fontMid}px monospace`, fill: "#67f" }).setOrigin(0.5).setInteractive().on('pointerup', () => this.scene.start('LobbyScene'));
  }
}

// --- SKOR GÖNDERME FONKSİYONU ---
function sendScoreToBot(score) {
    if (!tg || !tg.initData) {
        console.error("HATA: Telegram initData bulunamadı. Skor gönderilemiyor.");
        return;
    }
    const initData = tg.initData;
    const apiUrl = 'https://peacebot-641906716058.europe-central2.run.app/save_score';
    fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Telegram-Init-Data': initData },
      body: JSON.stringify({ score: score })
    })
    .then(response => {
        if (!response.ok) { return response.json().then(err => { throw new Error(JSON.stringify(err)) }); }
        return response.json();
    })
    .then(data => { console.log('Skor başarıyla kaydedildi:', data); })
    .catch(error => { console.error('HATA: Skor kaydedilirken bir sorun oluştu:', error); });
}

// --- PHASER BAŞLATMA ---
const config = {
    type: Phaser.AUTO,
    parent: 'phaser-game',
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: "#000",
    scene: [BootScene, LobbyScene, SideSelectScene, GameScene, GameOverScene, HowToPlayScene, LeaderboardScene],
    physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

let game;

tg.ready(() => {
    console.log("Telegram Web App hazır. Oyun başlatılıyor.");
    tg.expand();
    game = new Phaser.Game(config);
});

window.addEventListener('resize', () => {
    if (game) {
        game.scale.resize(window.innerWidth, window.innerHeight);
    }
});