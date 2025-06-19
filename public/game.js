let tg, currentUser, db;

// --- Oyun Konfigürasyonu ---
const firebaseConfig = { /* ...firebase config... */ };

// Referans oranlar (binalar için) - Genişlik ve yükseklik %'si
const BUILDINGS = [
    { x: 0.23, y: 0.68, w: 0.18, h: 0.18 },
    { x: 0.48, y: 0.67, w: 0.17, h: 0.18 },
    { x: 0.75, y: 0.69, w: 0.17, h: 0.15 }
];

// --- Preloader: assetleri yükle ---
class Preloader extends Phaser.Scene {
    constructor() { super({ key: 'Preloader' }); }
    preload() {
        this.load.image('lobby_bg', './assets/lobby_bg.png');
        this.load.image('play_button', './assets/play_button.png');
        this.load.image('score_icon', './assets/score_icon.png');
        this.load.image('coin_icon', './assets/coin_icon.png');
        this.load.image('rocket', './assets/rocket.png');
        this.load.image('explosion', './assets/explosion.gif');
        this.load.image('destroyed_building', './assets/destroyed_building.png');
        this.load.image('dove', './assets/dove.png');
        this.load.image('israel_bg', './assets/israel_bg.jpg');
        this.load.image('iran_bg', './assets/iran_bg.jpg');
    }
    create() { this.scene.start('ChooseSideScene'); }
}

// --- Taraf seçimi ekranı ---
class ChooseSideScene extends Phaser.Scene {
    constructor() { super({ key: 'ChooseSideScene' }); }
    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.text(w/2, h*0.2, 'Choose your side', { font: "36px monospace", fill: "#fff" }).setOrigin(0.5);

        const createButton = (img, x, y, txt, cb) => {
            const b = this.add.image(x, y, img).setDisplaySize(w*0.25, h*0.2).setInteractive();
            this.add.text(x, y+h*0.13, txt, { font: "26px monospace", fill: "#fff" }).setOrigin(0.5);
            b.on('pointerdown', cb);
        };
        createButton('israel_bg', w*0.3, h*0.45, "Defend Israel", ()=> this.scene.start('LobbyScene', {side:"israel"}));
        createButton('iran_bg', w*0.7, h*0.45, "Defend Iran", ()=> this.scene.start('LobbyScene', {side:"iran"}));
    }
}

// --- Lobi: skor/coin/leaderboard ve Play butonu ---
class LobbyScene extends Phaser.Scene {
    constructor() { super({ key: 'LobbyScene' }); }
    init(data) { this.selectedSide = data.side || 'israel'; }
    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.image(w/2, h/2, 'lobby_bg').setDisplaySize(w, h);

        this.add.text(w/2, h*0.10, `Welcome!`, { font: "32px monospace", fill: "#fff" }).setOrigin(0.5);

        // Skorlar/coinler vs.
        this.add.image(w*0.32, h*0.2, 'score_icon').setScale(0.6);
        this.add.image(w*0.32, h*0.27, 'coin_icon').setScale(0.6);
        const t1 = this.add.text(w*0.38, h*0.2, "Score: ...", { fontSize: "22px", fill: "#fff" }).setOrigin(0,0.5);
        const t2 = this.add.text(w*0.38, h*0.27, "Coins: ...", { fontSize: "22px", fill: "#fff" }).setOrigin(0,0.5);

        // Play Button
        const playBtn = this.add.image(w/2, h*0.7, 'play_button').setDisplaySize(w*0.4, h*0.12).setInteractive();
        playBtn.on('pointerdown', ()=>this.scene.start('GameScene', {side:this.selectedSide}));

        // Firebase'den skor/coin çek (fake ise sabit yaz)
        t1.setText("Score: 0"); t2.setText("Coins: 0");
        // --- Buraya gerçek verinizi ekleyebilirsiniz ---
    }
}

// --- Oyun sahnesi ---
class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    init(data) { this.selectedSide = data.side || 'israel'; }
    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.image(w/2, h/2, this.selectedSide === "iran" ? "iran_bg" : "israel_bg").setDisplaySize(w, h);

        // --- Binalar ---
        this.buildings = this.physics.add.staticGroup();
        this.buildingSprites = [];
        BUILDINGS.forEach((b, idx) => {
            const bx = w*b.x, by = h*b.y;
            const bw = w*b.w, bh = h*b.h;
            const bSprite = this.add.rectangle(bx, by, bw, bh, 0x888888).setOrigin(0.5,0.5);
            this.physics.add.existing(bSprite, true);
            bSprite.health = 3;
            this.buildings.add(bSprite);
            this.buildingSprites.push(bSprite);
        });

        // --- Skor ---
        this.score = 0;
        this.scoreText = this.add.text(20, 20, "Score: 0", { fontSize: "30px", fill: "#fff", stroke:"#000", strokeThickness:4 });

        // --- Roketler ---
        this.rockets = this.physics.add.group();
        this.physics.add.collider(this.rockets, this.buildings, this.hitBuilding, null, this);

        // --- Sürekli bomba at (dikey/yatay random)
        this.time.addEvent({ delay: 1300, callback: this.spawnRocket, callbackScope: this, loop: true });
    }
    spawnRocket() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        // 70% dikey, 30% yatay bombalar
        const mode = Math.random();
        let startX, startY, velX, velY, angle;
        let target = Phaser.Utils.Array.GetRandom(this.buildingSprites);

        if (mode < 0.7) {
            // Dikey yukarıdan aşağıya
            startX = Phaser.Math.Between(target.x-20, target.x+20);
            startY = -60;
            velX = 0;
            velY = Phaser.Math.Between(350, 420);
            angle = 180;
        } else {
            // Soldan sağa ya da sağdan sola
            if (Math.random() < 0.5) {
                // Soldan sağa
                startX = -60; startY = Phaser.Math.Between(h*0.45, h*0.80);
                velX = Phaser.Math.Between(350, 420); velY = 0;
                angle = 90;
            } else {
                // Sağdan sola
                startX = w+60; startY = Phaser.Math.Between(h*0.45, h*0.80);
                velX = -Phaser.Math.Between(350, 420); velY = 0;
                angle = -90;
            }
        }
        // Roket oluştur
        let rocket = this.rockets.create(startX, startY, 'rocket');
        rocket.setVelocity(velX, velY);
        rocket.setAngle(angle);
        rocket.setInteractive();
        rocket.on("pointerdown", ()=>this.destroyRocket(rocket));
    }
    destroyRocket(rocket) {
        if (!rocket.active) return;
        this.score += 10; this.scoreText.setText("Score: "+this.score);
        let ex = this.add.image(rocket.x, rocket.y, 'explosion').setScale(1.1);
        this.time.delayedCall(250, ()=>ex.destroy());
        let dove = this.add.image(rocket.x, rocket.y, 'dove').setScale(0.5);
        this.tweens.add({ targets: dove, y: dove.y-100, alpha:0, duration:900, onComplete:()=>dove.destroy() });
        rocket.destroy();
    }
    hitBuilding(rocket, building) {
        if (!rocket.active) return;
        building.health--;
        let ex = this.add.image(rocket.x, rocket.y, 'explosion').setScale(1.3);
        this.time.delayedCall(350, ()=>ex.destroy());
        rocket.destroy();

        // Bina tamamen yok olduysa
        if (building.health <= 0) {
            building.fillColor = 0x333333; // Gri olsun
            // İstersen destroyed_building sprite ekle
        }
        // Game over (tüm binalar gitti mi)
        if (this.buildingSprites.every(b=>b.health<=0)) {
            this.scene.start('GameOverScene', {score:this.score});
        }
    }
}

// --- Oyun Sonu ---
class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }
    init(data) { this.finalScore = data.score || 0; }
    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.rectangle(w/2, h/2, w, h, 0x000000, 0.5);
        this.add.text(w/2, h*0.4, "Game Over", { fontSize: "42px", fill: "#FFD700", align:"center" }).setOrigin(0.5);
        this.add.text(w/2, h*0.5, "Score: "+this.finalScore, { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);
        // Yeniden başlat
        this.input.once('pointerdown', ()=>this.scene.start('ChooseSideScene'));
    }
}

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    scene: [Preloader, ChooseSideScene, LobbyScene, GameScene, GameOverScene],
    physics: { default: 'arcade', arcade: { gravity: { y: 0 }, debug: false } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};
window.addEventListener('load', ()=>new Phaser.Game(config));
