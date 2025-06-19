// --- Telegram & Firestore Setup (skor yazımı sadece bot.py ile olacak, burada sadece gösterim var) ---
let tg = window.Telegram && window.Telegram.WebApp;
let currentUser = tg && tg.initDataUnsafe ? tg.initDataUnsafe.user : null;

// (Eğer sadece Firestore'dan okuma için gerekli, aşağıdaki ayarları değiştir)
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

// -- Oyun içi binalar için koordinatlar (resimdeki çarpılara göre, gerekirse oynanır) --
const buildingCoords = [
  { x: 60, y: 500 },   { x: 130, y: 550 }, { x: 210, y: 530 }, { x: 280, y: 560 },
  { x: 340, y: 510 },  { x: 100, y: 650 }, { x: 180, y: 650 }, { x: 260, y: 630 },
  { x: 340, y: 670 },  { x: 200, y: 600 }
];
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
    this.load.image('building_bar', 'assets/score.png'); // Basit bar için kullanılabilir
    this.load.spritesheet('smoke_anim', 'assets/smoke_sheet.png', { frameWidth: 64, frameHeight: 64 });
   
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

// --- Lobby (Ana Menü, Kullanıcı Bilgileri, 3 Buton, Logo) ---
class LobbyScene extends Phaser.Scene {
  constructor() { super('LobbyScene'); }
  async create() {
    this.add.image(210, 385, 'bg_lobby').setDisplaySize(420, 770);
    await fetchUserStats();
    let y = 55;
    let statColor = "#ffe349";

    // Hoşgeldin başlığı (sol üst)
    this.add.text(24, y, `Welcome, ${userStats.username || 'Player'}!`, { font: "22px monospace", fill: "#fff" });
    y += 38;

    // Max/Total Score/Coins ikonlu ve alt alta
    this.add.image(33, y + 13, 'score_icon').setScale(0.7);
    this.add.text(55, y, `Max Score: ${userStats.score}`, { font: "16px monospace", fill: statColor });
    y += 22;
    this.add.text(55, y, `Total Score: ${userStats.total_score}`, { font: "16px monospace", fill: statColor });
    y += 22;
    this.add.image(33, y + 13, 'coin_icon').setScale(0.7);
    this.add.text(55, y, `PMNOFO Coins: ${userStats.total_pmno_coins}`, { font: "16px monospace", fill: statColor });
    y += 40;

    // --- Top Players (en fazla 5, Top başlığı)
    const leaders = (await fetchLeaderboard()).slice(0, 5);
    let lbY = y;
    this.add.text(125, lbY, "Top Players", { font: "bold 19px monospace", fill: statColor });
    lbY += 22;
    leaders.forEach((u, i) => {
      this.add.text(80, lbY + i * 18, `${i + 1}. ${u.username || 'Anon'} - ${u.total_score} pts`, { font: "15px monospace", fill: "#fff" });
    });
    lbY += leaders.length * 18 + 10;

    // --- Start Mission Button (tam ortada, sadece 1 defa yazı!)
    const startBtn = this.add.image(210, lbY + 40, 'button').setScale(0.39).setInteractive();
    startBtn.on('pointerup', () => this.scene.start('SideSelectScene'));
    this.add.text(210, lbY + 27, "START MISSION", { font: "23px monospace", fill: "#13f7f7" }).setOrigin(0.5, 0);

    // --- Alt menü
    this.add.text(45, lbY + 88, "Leaderboard", { font: "18px monospace", fill: "#ffe349" })
        .setInteractive()
        .on('pointerup', () => this.scene.start('LeaderboardScene'));
    this.add.text(260, lbY + 88, "How to Play?", { font: "18px monospace", fill: "#43c0f7" })
        .setInteractive()
        .on('pointerup', () => this.scene.start('HowToPlayScene'));

    // --- En altta logo küçük ve ortada
    this.add.image(210, 748, 'logo').setScale(0.10);
  }
}

// --- Taraf Seçimi (Resimli, Yazılar kısa, geçiş animasyonu olabilir) ---
class SideSelectScene extends Phaser.Scene {
  constructor() { super('SideSelectScene'); }
  create() {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    this.add.rectangle(210, 385, 420, 770, 0x000000, 0.95);

    this.add.text(60, 70, "Choose your side", { font: "35px monospace", fill: "#fff" });

    // İsrail
    let btn1 = this.add.image(120, 220, 'bg_israel').setDisplaySize(120, 130).setInteractive();
    let tx1 = this.add.text(70, 280, "Israel", { font: "22px monospace", fill: "#e2e2e2" });
    btn1.on('pointerup', () => this.scene.start('GameScene', { side: 'israel' }));

    // İran
    let btn2 = this.add.image(300, 220, 'bg_iran').setDisplaySize(120, 130).setInteractive();
    let tx2 = this.add.text(250, 280, "Iran", { font: "22px monospace", fill: "#e2e2e2" });
    btn2.on('pointerup', () => this.scene.start('GameScene', { side: 'iran' }));

    // Geri dönmek için logo veya alan bırakabilirsin
    this.add.image(210, 750, 'logo').setScale(0.14);
  }
}

// --- Oyun Ana Sahnesi ---
class GameScene extends Phaser.Scene {
  constructor() { super('GameScene'); }
  init(data) { this.side = data.side || 'israel'; }

  create() {
    // Arkaplan
    let bg = this.add.image(210, 385, this.side === 'iran' ? 'bg_iran' : 'bg_israel').setDisplaySize(420, 770);

    // Skor & toplam health bar
    this.score = 0;
    this.add.text(25, 25, "Score: ", { font: "28px monospace", fill: "#fff" });
    this.scoreText = this.add.text(140, 25, "0", { font: "28px monospace", fill: "#fff" });

    // Toplam city health bar (üstte)
    this.cityMaxHealth = buildingCoords.length * maxBuildingHealth;
    this.cityHealth = this.cityMaxHealth;
    this.healthBarBg = this.add.rectangle(90, 65, 240, 18, 0x333333).setOrigin(0, 0.5);
    this.healthBar = this.add.rectangle(90, 65, 240, 18, 0x1ff547).setOrigin(0, 0.5);

    // Binaları çiz
    this.buildings = buildingCoords.map(coord => ({
      x: coord.x,
      y: coord.y,
      health: maxBuildingHealth,
      sprite: this.add.rectangle(coord.x, coord.y, 45, 40, 0x74b9ff, 0.2)
    }));

    // Destroyed binalar için dizi
    this.destroyedSprites = [];

    // Bombaları grup yap
    this.rockets = this.physics.add.group();

    // Timer ile bomba oluştur
    this.rocketTimer = this.time.addEvent({
      delay: 1100, loop: true, callback: () => this.spawnRocket()
    });

    // Mouse/touch ile bomba patlat
    this.input.on('gameobjectdown', (pointer, rocket) => {
      if (rocket.texture && rocket.texture.key === 'rocket') {
        this.explodeRocket(rocket);
      }
    });

    // Her frame health bar güncelle
    this.events.on('update', this.updateHealthBar, this);
  }
 
  spawnRocket() {
  // Hedef bina belirle
  let targetIdx = Phaser.Math.Between(0, buildingCoords.length - 1);
  let target = buildingCoords[targetIdx];
  let speed = Phaser.Math.Between(170, 260);

  // 0-2 yukarıdan, 3 soldan, 4 sağdan
  let entrySide = Phaser.Math.Between(0, 4);

  let x, y, vx = 0, vy = 0;
  if (entrySide <= 2) {
    // Yukarıdan: x bina ile aynı, y = -30 (sahne üstünde başlasın)
    x = target.x;
    y = -30; // 0 yerine -30
    vx = 0;
    vy = speed;
  } else if (entrySide === 3) {
    // Soldan: y bina ile aynı, x = -30
    x = -30; // 0 yerine -30
    y = target.y;
    vx = speed;
    vy = 0;
  } else {
    // Sağdan: y bina ile aynı, x = 450 (sahne dışında başlasın)
    x = 450; // 420 yerine 450
    y = target.y;
    vx = -speed;
    vy = 0;
  }

  // Roketi ekle
  let rocket = this.physics.add.sprite(x, y, 'rocket').setScale(0.8).setInteractive();
  rocket.body.setVelocity(vx, vy);
  rocket.targetIdx = targetIdx;
  this.rockets.add(rocket);

  // Çarpışma ayarla
  this.physics.add.overlap(rocket, this.buildings[targetIdx].sprite, () => this.hitBuilding(rocket, targetIdx));
}


  explodeRocket(rocket) {
    // Patlama
    let exp = this.add.sprite(rocket.x, rocket.y, 'explosion').setScale(1.4);
    exp.play && exp.play('explode');
    this.time.delayedCall(400, () => exp.destroy());
    rocket.destroy();
    // Duman efekti animasyonlu:
    showSmoke(this, rocket.x, rocket.y - 20);

    // Güvercin efekti
    let dove = this.add.sprite(rocket.x, rocket.y, 'dove').setScale(0.25);
    this.tweens.add({
      targets: dove, y: dove.y - 90, alpha: 0, duration: 1200, onComplete: () => dove.destroy()
    });

    // Skor
    this.score += 1;
    this.scoreText.setText(this.score);

    // Skor kaydını Telegram'a gönder
    sendScoreToBot(this.score);
  }

  hitBuilding(rocket, idx) {
    rocket.destroy();

    // Patlama ve duman efekti
    let exp = this.add.sprite(rocket.x, rocket.y, 'explosion').setScale(1.5);
    let smoke = this.add.sprite(rocket.x, rocket.y - 20, 'smoke_anim').setScale(0.7).setAlpha(0.8);
    this.time.delayedCall(350, () => exp.destroy());
    this.tweens.add({ targets: smoke, alpha: 0, duration: 1700, onComplete: () => smoke.destroy() });

    // Bina health azalt
    let building = this.buildings[idx];
    building.health -= 1;
    this.cityHealth -= 1;
    if (building.health <= 0 && !this.destroyedSprites[idx]) {
      // Destroyed bina
      building.sprite.setFillStyle(0x333333, 0.45);
      this.destroyedSprites[idx] = this.add.image(building.x, building.y, 'destroyed_building').setScale(0.19);
      showSmoke(this, building.x, building.y - 50);
    }

    // Game over
    if (this.cityHealth <= 0) {
      this.rocketTimer.remove();
      this.time.delayedCall(850, () => this.scene.start('GameOverScene', { score: this.score }));
    }
  }

  updateHealthBar() {
    this.healthBar.width = 240 * (this.cityHealth / this.cityMaxHealth);
    if (this.cityHealth / this.cityMaxHealth < 0.33) this.healthBar.setFillStyle(0xff2323);
    else if (this.cityHealth / this.cityMaxHealth < 0.6) this.healthBar.setFillStyle(0xffcc29);
    else this.healthBar.setFillStyle(0x1ff547);
  }
}

// --- Game Over & Skor Bildirimi ---
class GameOverScene extends Phaser.Scene {
  constructor() { super('GameOverScene'); }
  create(data) {
    this.cameras.main.fadeIn(200, 0, 0, 0);
    this.add.rectangle(210, 385, 420, 770, 0x181818, 0.96);
    this.add.text(120, 220, "GAME OVER", { font: "36px monospace", fill: "#fff" });
    this.add.text(135, 280, `Score: ${data.score || 0}`, { font: "26px monospace", fill: "#23d4fc" });

    // Yeniden başlat
    let btn = this.add.text(160, 360, "Restart", { font: "26px monospace", fill: "#ffda45", backgroundColor: "#23262f" })
      .setInteractive().on('pointerup', () => this.scene.start('LobbyScene'));
    // Logo en alta
    this.add.image(210, 750, 'logo').setScale(0.13);
  }
}

// --- How to Play ve Leaderboard ekranı ekle ---
class HowToPlayScene extends Phaser.Scene {
  constructor() { super('HowToPlayScene'); }
  create() {
    this.add.rectangle(210, 385, 420, 770, 0x000000, 0.96);
    this.add.text(80, 80, "How To Play", { font: "28px monospace", fill: "#fff" });
    let msg = "Tap the rockets to turn them into peace doves!\nDon't let them hit the city.\nDefend all buildings as long as you can!\nEach rocket = +1 point.\n\nBreak your record for more coins.";
    this.add.text(40, 140, msg, { font: "20px monospace", fill: "#fff" });
    this.add.text(120, 700, "< Back", { font: "21px monospace", fill: "#67f" }).setInteractive().on('pointerup', () => this.scene.start('LobbyScene'));
  }
}
class LeaderboardScene extends Phaser.Scene {
  constructor() { super('LeaderboardScene'); }
  async create() {
    this.add.rectangle(210, 385, 420, 770, 0x000000, 0.93);
    this.add.text(120, 70, "Leaderboard", { font: "29px monospace", fill: "#ffe349" });
    const leaders = await fetchLeaderboard();
    let y = 130;
    leaders.forEach((u, i) => {
      this.add.text(70, y + i * 38, `${i + 1}. ${u.username || "Anon"} - ${u.total_score} pts`, { font: "22px monospace", fill: "#fff" });
    });
    this.add.text(120, 700, "< Back", { font: "21px monospace", fill: "#67f" }).setInteractive().on('pointerup', () => this.scene.start('LobbyScene'));
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
const config = {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  width: 420,
  height: 770,
  backgroundColor: "#000",
  scene: [BootScene, LobbyScene, SideSelectScene, GameScene, GameOverScene, HowToPlayScene, LeaderboardScene],
  physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};
const game = new Phaser.Game(config);
