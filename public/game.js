// --- Telegram & Firestore Setup (skor yazımı sadece bot.py ile olacak, burada sadece gösterim var) ---
let tg = window.Telegram && window.Telegram.WebApp;
let currentUser = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;

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

function getResponsiveBuildingCoords(w, h) {
  return [
    { x: w * 0.13, y: h * 0.65 },   // örnek: eski 60,500 -> %13, %65
    { x: w * 0.31, y: h * 0.715 },
    { x: w * 0.5, y: h * 0.69 },
    { x: w * 0.69, y: h * 0.72 },
    { x: w * 0.81, y: h * 0.66 },
    { x: w * 0.24, y: h * 0.83 },
    { x: w * 0.43, y: h * 0.84 },
    { x: w * 0.62, y: h * 0.81 },
    { x: w * 0.81, y: h * 0.87 },
    { x: w * 0.48, y: h * 0.78 }
  ];
}

 
const maxBuildingHealth = 3;

// --- Sprite Yüklemeleri ---
class BootScene extends Phaser.Scene {
  constructor() { super('BootScene'); }
  preload() {
    this.load.image('logo', 'assets/logo.png');
    this.load.image('button', 'assets/play_button.png');
    this.load.image('bg_lobby', 'assets/lobby_bg.png');
    this.load.image('bg_israel', 'assets/israel_bg.jpg');
    this.load.image('bg_iran', 'assets/iran_bg.jpg');
    this.load.image('rocket', 'assets/rocket.png');
    this.load.image('dove', 'assets/dove.png');
    this.load.image('explosion', 'assets/explosion.gif');
    this.load.image('destroyed_building', 'assets/destroyed_building.png');
    this.load.image('score_icon', 'assets/score_icon.png');
    this.load.image('coin_icon', 'assets/coin_icon.png');
    this.load.image('building_bar', 'assets/score.png');
    this.load.spritesheet('smoke_anim', 'assets/smoke_sheet.png', { frameWidth: 64, frameHeight: 64 });
    this.load.on('complete', () => {
    console.log('All assets loaded');
  });
  }
  create() {
    this.anims.create({
      key: 'smoke_play',
      frames: this.anims.generateFrameNumbers('smoke_anim', { start: 0, end: 5 }),
      frameRate: 10,
      repeat: 0
    });
    this.scene.start('LobbyScene');
  }
}

// --- Lobby (Responsive, tam ekrana oturur, logo büyük, bilgiler sağ üstte taşmaz) ---
class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }
  async create() {
    const vars = getScaleVars(this);

    // BG tam ekran
    this.add.image(vars.w/2, vars.h/2, 'bg_lobby').setDisplaySize(vars.w, vars.h);

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

// --- Taraf Seçimi ---
class SideSelectScene extends Phaser.Scene {
  constructor() { super('SideSelectScene'); }
  create() {
    const vars = getScaleVars(this);
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.rectangle(vars.w/2, vars.h/2, vars.w, vars.h, 0x000000, 0.95);
    this.add.text(vars.w/2, vars.h*0.08, "Choose your side", { font: `${vars.fontBig}px monospace`, fill: "#fff" }).setOrigin(0.5);

    // İsrail
    let btn1 = this.add.image(vars.w/3, vars.h/3, 'bg_israel').setDisplaySize(vars.w/3.2, vars.h/4.8).setInteractive();
    let tx1 = this.add.text(vars.w/3, vars.h/3+70, "Israel", { font: `${vars.fontMid}px monospace`, fill: "#e2e2e2" }).setOrigin(0.5);
    btn1.on('pointerup', () => this.scene.start('GameScene', { side: 'israel' }));

    // İran
    let btn2 = this.add.image(vars.w*2/3, vars.h/3, 'bg_iran').setDisplaySize(vars.w/3.2, vars.h/4.8).setInteractive();
    let tx2 = this.add.text(vars.w*2/3, vars.h/3+70, "Iran", { font: `${vars.fontMid}px monospace`, fill: "#e2e2e2" }).setOrigin(0.5);
    btn2.on('pointerup', () => this.scene.start('GameScene', { side: 'iran' }));

    this.add.image(vars.w/2, vars.h-65, 'logo').setScale(vars.logoScale * 0.8);
  }
}

// --- Oyun Ana Sahnesi (Responsive rocket spawn, ekrana göre tam path) ---
class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene', physics: { arcade: { debug: false } } }); }
  init(data) { this.side = data.side || 'israel'; }

  create() {
    const vars = getScaleVars(this);
    this.buildingCoords = getResponsiveBuildingCoords(vars.w, vars.h);

    // --- Binalar ve üzerlerine bar ---
    this.buildings = this.buildingCoords.map(coord => {
      let group = {};
      group.x = coord.x;
      group.y = coord.y;
      group.health = maxBuildingHealth;
      // Bina görseli
      group.sprite = this.add.rectangle(coord.x, coord.y, 45, 40, 0x74b9ff, 0.25);
      // Health bar (üstünde)
      group.barBg = this.add.rectangle(coord.x, coord.y - 35, 38, 6, 0x333333, 0.7);
      group.bar = this.add.rectangle(coord.x, coord.y - 35, 36, 4, 0x1ff547, 0.99).setOrigin(0.5, 0.5);
      return group;
    });

    this.rockets = this.physics.add.group();
    this.score = 0;

    // Oyun döngüsü — roketleri gönder
    this.rocketTimer = this.time.addEvent({
      delay: 1100,
      loop: true,
      callback: () => {
        let idx = Phaser.Math.Between(0, this.buildings.length - 1);
        let target = this.buildings[idx];

        let x = target.x;
        let y = 0;
        let rocket = this.physics.add.sprite(x, y, 'rocket').setScale(0.8).setInteractive();
        rocket.body.setVelocity(0, 230); // YUKARIDAN AŞAĞI HIZ
        rocket.targetIdx = idx;
        this.rockets.add(rocket);

        // Çakışınca
        this.physics.add.overlap(rocket, target.sprite, () => {
          rocket.destroy();
          // Bina health azalt
          target.health--;
          // Health bar güncelle
          target.bar.width = Math.max(0, (target.health / maxBuildingHealth) * 36);
          if (target.health <= 0) {
            target.sprite.setFillStyle(0x333333, 0.35);
            target.bar.setFillStyle(0xff2323);
          }
        });
      }
    });

    // Roket patlat (tıkla)
    this.input.on('gameobjectdown', (pointer, rocket) => {
      if (rocket.texture && rocket.texture.key === 'rocket') {
        rocket.destroy();
        this.score++;
        // Skoru ekranda güncellemek için buraya kod ekleyebilirsin
      }
    });
  }
}


// --- Game Over & Skor Bildirimi (Responsive) ---
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
  create(data) {
    const vars = getScaleVars(this);
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.add.rectangle(vars.w/2, vars.h/2, vars.w, vars.h, 0x181818, 0.96);
    this.add.text(vars.w/2, vars.h/3, "GAME OVER", { font: `${vars.fontBig}px monospace`, fill: "#fff" }).setOrigin(0.5);
    this.add.text(vars.w/2, vars.h/2.35, `Score: ${data.score || 0}`, { font: `${vars.fontMid+6}px monospace`, fill: "#23d4fc" }).setOrigin(0.5);

    let btn = this.add.text(vars.w/2, vars.h/1.7, "Restart", { font: `${vars.fontMid+3}px monospace`, fill: "#ffda45", backgroundColor: "#23262f" })
            .setOrigin(0.5)
      .setInteractive()
      .on('pointerup', () => this.scene.start('LobbyScene'));

    // Büyük logo
    this.add.image(vars.w/2, vars.h - 65, 'logo').setScale(vars.logoScale);
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

// --- Skor Telegram Bot'a gönderimi ---
function sendScoreToBot(currentScore) {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.sendData(
      JSON.stringify({
        type: 'score_update',
        user_id: window.Telegram.WebApp.initDataUnsafe.user.id,
        score: currentScore
      })
    );
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
  scene: [BootScene, LobbyScene, SideSelectScene, GameScene, GameOverScene, HowToPlayScene, LeaderboardScene],
  physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
  scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }
};

const game = new Phaser.Game(config);
