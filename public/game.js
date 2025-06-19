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

class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    preload() {
        this.load.image('bg', 'assets/israel_bg.jpg'); // Arka plan örnek
        this.load.image('rocket', 'assets/rocket.png');
        this.load.image('destroyed_building', 'assets/destroyed_building.png');
        this.load.image('explosion', 'assets/explosion.gif');
        // diğer assetler...
    }

    create() {
        const w = this.sys.game.config.width;
        const h = this.sys.game.config.height;

        // Arka plan
        this.add.image(w/2, h/2, 'bg').setDisplaySize(w, h);

        // Skor
        this.score = 0;
        this.scoreText = this.add.text(24, 24, 'Score: 0', { fontSize: '32px', fill: '#fff', stroke:'#000', strokeThickness: 4 });

        // Bina bilgileri ve sprite'ları
        this.buildingSprites = [];
        let buildingsData = [
            { x: w*0.30, y: h-120, width: 80, height: 120 },
            { x: w*0.50, y: h-120, width: 80, height: 120 },
            { x: w*0.70, y: h-120, width: 80, height: 120 }
        ];
        buildingsData.forEach(data => {
            let b = this.physics.add.staticImage(data.x, data.y, null)
                .setDisplaySize(data.width, data.height)
                .setOrigin(0.5,1)
                .setVisible(true);
            b.health = 3;
            b.active = true;
            this.buildingSprites.push(b);
        });

        // Roket grubu
        this.rockets = this.physics.add.group();

        // Roket-bina çarpışma
        this.physics.add.collider(this.rockets, this.buildingSprites, this.hitBuilding, null, this);

        // Her 1.2sn'de bir roket üret
        this.time.addEvent({
            delay: 1200,
            loop: true,
            callback: ()=>this.spawnRocket()
        });
    }

    spawnRocket() {
        // Dikey olarak rastgele X'de, yukarıdan aşağıya düşecek
        const w = this.sys.game.config.width;
        let x = Phaser.Math.Between(w*0.15, w*0.85);
        let rocket = this.rockets.create(x, -50, 'rocket');
        rocket.setVelocityY(Phaser.Math.Between(280, 400));
        rocket.setScale(0.55);

        rocket.setInteractive();
        rocket.on('pointerdown', () => this.destroyRocket(rocket));
    }

    destroyRocket(rocket) {
        if (!rocket.active) return;

        // Skor artır
        this.score += 10;
        this.scoreText.setText('Score: ' + this.score);

        // Patlama animasyonu
        let explosion = this.add.image(rocket.x, rocket.y, 'explosion').setScale(0.7);
        this.time.delayedCall(550, ()=>explosion.destroy());

        // Güvercin, duman vs de çıkarabilirsin
        rocket.destroy();
    }

    hitBuilding(rocket, building) {
        if (!rocket.active || !building.active) return;

        building.health--;

        // Bina yok olunca:
        if (building.health <= 0 && building.active) {
            building.active = false;
            building.setVisible(false);

            // Destroyed building sprite
            let destroyed = this.add.image(building.x, building.y, 'destroyed_building')
                .setOrigin(0.5,1)
                .setDisplaySize(building.displayWidth, building.displayHeight);

            // Duman/gif efektini biraz üstte göster
            let smoke = this.add.image(building.x, building.y - building.displayHeight * 0.7, 'explosion')
                .setScale(0.7);
            this.time.delayedCall(1100, ()=>smoke.destroy());
        }

        rocket.destroy();

        // Game over: Tüm binalar yoksa
        if (this.buildingSprites.every(b=>b.health<=0)) {
            this.scene.start('GameOverScene', {score:this.score});
        }
    }
}

// Game Over sahnesi örneği:
class GameOverScene extends Phaser.Scene {
    constructor() {
        super('GameOverScene');
    }

    create(data) {
        const w = this.sys.game.config.width;
        const h = this.sys.game.config.height;
        this.add.text(w/2, h/2, 'GAME OVER\nScore: '+(data.score || 0), 
            { fontSize: '38px', fill: '#f44', align:'center' }).setOrigin(0.5);
        this.input.once('pointerdown', ()=>this.scene.start('GameScene'));
    }
}

// Phaser başlatma
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 650,
    backgroundColor: '#111',
    scene: [GameScene, GameOverScene],
    physics: { default: 'arcade', arcade: { gravity: {y:0} } }
};
const game = new Phaser.Game(config);

