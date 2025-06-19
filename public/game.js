let selectedSide = null;
let userName = "Player";

class ChooseSideScene extends Phaser.Scene {
    constructor() { super({ key: 'ChooseSideScene' }); }
    preload() {
        this.load.image('israel_bg', 'assets/israel_bg.jpg');
        this.load.image('iran_bg', 'assets/iran_bg.jpg');
    }
    create() {
        this.cameras.main.setBackgroundColor('#000');
        this.add.text(this.scale.width/2, 120, "Choose your side", { fontSize: "36px", fill: "#fff", fontFamily: "monospace" }).setOrigin(0.5);

        const isr = this.add.image(this.scale.width/2-90, 260, 'israel_bg').setDisplaySize(120,120).setInteractive();
        const irn = this.add.image(this.scale.width/2+90, 260, 'iran_bg').setDisplaySize(120,120).setInteractive();
        this.add.text(this.scale.width/2-90, 335, "Israel", { fontSize: "20px", fill: "#fff", fontFamily: "monospace" }).setOrigin(0.5);
        this.add.text(this.scale.width/2+90, 335, "Iran", { fontSize: "20px", fill: "#fff", fontFamily: "monospace" }).setOrigin(0.5);

        isr.on('pointerdown',()=>{ selectedSide="israel"; this.scene.start('GameScene'); });
        irn.on('pointerdown',()=>{ selectedSide="iran"; this.scene.start('GameScene'); });
    }
}

class GameScene extends Phaser.Scene {
    constructor() { super({ key: 'GameScene' }); }
    preload() {
        this.load.image('rocket', 'assets/rocket.png');
        this.load.image('explosion', 'assets/explosion.gif');
        this.load.image('dove', 'assets/dove.png');
        this.load.image('destroyed', 'assets/destroyed_building.png');
        this.load.image('israel_bg', 'assets/israel_bg.jpg');
        this.load.image('iran_bg', 'assets/iran_bg.jpg');
        // Bina görsellerin varsa onları da buraya ekle!
    }
    create() {
        // Arkaplan
        this.add.image(this.scale.width/2, this.scale.height/2, (selectedSide=="iran"?"iran_bg":"israel_bg"))
            .setDisplaySize(this.scale.width, this.scale.height);

        // Bina pozisyonları (örnek: 3 bina)
        this.buildings = [
            {x: this.scale.width*0.32, y: this.scale.height-140, health: 3, max:3, sprite:null, destroyed:false},
            {x: this.scale.width*0.5, y: this.scale.height-150, health: 3, max:3, sprite:null, destroyed:false},
            {x: this.scale.width*0.68, y: this.scale.height-140, health: 3, max:3, sprite:null, destroyed:false},
        ];
        this.totalHealth = 9; // 3 bina x 3 can
        // Binaları sprite olarak ekle
        this.buildings.forEach(b=>{
            b.sprite = this.add.rectangle(b.x,b.y,60,80,0xffffff,0.01); // Görünmez kutu, ister gerçek görsel koy
        });

        this.score = 0;
        this.scoreText = this.add.text(25, 25, "Score: 0", { fontSize: "32px", fill: "#fff", fontFamily: "monospace" });
        // Health bar
        this.healthBarBg = this.add.rectangle(this.scale.width/2, 25, 200, 18, 0x333333).setOrigin(0.5);
        this.healthBar = this.add.rectangle(this.scale.width/2, 25, 200, 16, 0x00FF00).setOrigin(0.5);

        // Roketler grubu
        this.rockets = this.physics.add.group();

        // Çarpışma
        this.physics.add.overlap(this.rockets, this.buildings.map(b=>b.sprite), (rocket, buildingSprite) => {
            const bld = this.buildings.find(b=>b.sprite===buildingSprite);
            if(!bld || bld.destroyed) return;
            bld.health--;
            if(bld.health<=0 && !bld.destroyed) {
                bld.destroyed=true;
                // Bina resmi değişsin + üstten duman/animasyon ekle
                const destroyed = this.add.image(bld.x, bld.y, 'destroyed').setDisplaySize(60,80);
                // Basit bir duman efekti (explosion yukarı doğru fadeOut)
                const smoke = this.add.image(bld.x, bld.y-30, 'explosion').setScale(0.8);
                this.tweens.add({targets:smoke, y:smoke.y-60, alpha:0, duration:1500, onComplete:()=>smoke.destroy()});
            }
            rocket.destroy();
            this.updateHealthBar();
            if (this.buildings.every(b=>b.health<=0)) { this.gameOver(); }
        },null,this);

        // Oyun başladığında roketler üret
        this.spawnTimer = this.time.addEvent({
            delay: 1200,
            callback: ()=>this.spawnRocket(),
            loop: true
        });
    }
    spawnRocket() {
        // Hız: başlarda yavaş, sonra karışık (zamanla hızlanır)
        let gameTime = this.time.now/1000;
        let speed = 140+Math.random()*60 + Math.min(gameTime*3,150);
        let sideChance = Math.random();
        let startX, startY, velX, velY;
        let building = Phaser.Utils.Array.GetRandom(this.buildings.filter(b=>b.health>0));
        if(!building) return;

        if (sideChance < 0.8) { // %80 dikey
            startX = building.x + Phaser.Math.Between(-20,20);
            startY = -40;
            velX = 0;
            velY = speed;
        } else { // %20 yandan
            startY = building.y - 100;
            if (Math.random()<0.5) { // soldan
                startX = 0;
                velX = speed*0.7;
            } else { // sağdan
                startX = this.scale.width;
                velX = -speed*0.7;
            }
            velY = speed*0.4;
        }
        const rocket = this.rockets.create(startX,startY,'rocket').setDisplaySize(32,48);
        rocket.setVelocity(velX,velY);
        rocket.setInteractive();
        rocket.on('pointerdown',()=>this.destroyRocket(rocket));
    }
    destroyRocket(rocket) {
        this.score+=10;
        this.scoreText.setText("Score: " + this.score);
        // Patlama efekti
        const explosion = this.add.image(rocket.x,rocket.y,'explosion').setScale(0.7);
        this.time.delayedCall(500, ()=>explosion.destroy());
        // Güvercin efekti
        const dove = this.add.image(rocket.x,rocket.y,'dove').setScale(0.5);
        this.tweens.add({
            targets: dove,
            y: dove.y-120,
            alpha: 0,
            duration: 1200,
            onComplete: ()=>dove.destroy()
        });
        rocket.destroy();
    }
    updateHealthBar() {
        let sum = this.buildings.reduce((a,b)=>a+Math.max(0,b.health),0);
        let ratio = sum/this.totalHealth;
        this.healthBar.width = 200*ratio;
        this.healthBar.fillColor = (ratio>0.6)?0x00FF00:(ratio>0.25?0xFFFF00:0xFF0000);
    }
    gameOver() {
        this.spawnTimer.remove();
        // Skor + liderlik tablosu göster
        this.scene.start('GameOverScene', { score: this.score, user: userName });
    }
}

class GameOverScene extends Phaser.Scene {
    constructor() { super({ key: 'GameOverScene' }); }
    create(data) {
        this.cameras.main.setBackgroundColor('#000');
        this.add.text(this.scale.width/2, 130, "Game Over", { fontSize: "40px", fill: "#fff" }).setOrigin(0.5);
        this.add.text(this.scale.width/2, 200, "Score: "+data.score, { fontSize: "30px", fill: "#fff" }).setOrigin(0.5);
        // TODO: Liderlik tablosu API çağrısı ile getirilebilir
        this.add.text(this.scale.width/2, 300, "Leaderboard soon!", { fontSize: "18px", fill: "#fff" }).setOrigin(0.5);
        this.input.once('pointerdown', ()=>this.scene.start('ChooseSideScene'));
    }
}

// Phaser config
const config = {
    type: Phaser.AUTO,
    width: 400,
    height: 700,
    parent: 'phaser-game',
    backgroundColor: "#000",
    scene: [ChooseSideScene, GameScene, GameOverScene],
    physics: { default: 'arcade', arcade: { gravity: {y:0}, debug: false } }
};

window.onload = () => { new Phaser.Game(config); };
