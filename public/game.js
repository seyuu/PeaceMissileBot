let tg, currentUser, db, game;
let selectedSide = null;
let currentHighScore = 0;
let leaderboardTopScore = 0;

const firebaseConfig = {
  apiKey: "AIzaSyBtOkm8dpjVXlzAXCEB5sL_Awqq4HEeemc",
  authDomain: "peacemissile-game.firebaseapp.com",
  projectId: "peacemissile-game",
  storageBucket: "peacemissile-game.firebasestorage.app",
  messagingSenderId: "641906716058",
  appId: "1:641906716058:web:1376e93994fab29f049e23"
};

// ------ Preloader Scene ------
class Preloader extends Phaser.Scene {
    constructor() { super('Preloader'); }
    preload() {
        this.load.image('lobby_bg', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/lobby_bg.png');
        this.load.image('play_button', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/play_button.png');
        this.load.image('score_icon', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/score_icon.png');
        this.load.image('coin_icon', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/coin_icon.png');
        this.load.image('rocket', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/rocket.png');
        this.load.image('explosion', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/explosion.gif');
        this.load.image('dove', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/dove.png');
        this.load.image('destroyed_building', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/destroyed_building.png');
        this.load.image('iran_bg', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/iran_bg.jpg');
        this.load.image('israel_bg', 'https://raw.githubusercontent.com/seyuu/PeaceMissileBot/main/public/assets/israel_bg.jpg');
        // asset eklemesi gerekirse buraya
    }
    create() {
        if (window.Telegram && window.Telegram.WebApp) {
            tg = window.Telegram.WebApp;
            currentUser = tg.initDataUnsafe.user;
            tg.ready(); tg.expand();
        } else {
            currentUser = { id: 'test_user', first_name: 'Guest', username: 'guest' };
        }
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            db = firebase.firestore();
        } else {
            db = firebase.firestore();
        }
        this.scene.start('SideSelectionScene');
    }
}

// ------ Taraf Seçimi ------
class SideSelectionScene extends Phaser.Scene {
    constructor() { super('SideSelectionScene'); }
    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.text(w/2, h*0.18, 'Choose your side', { fontSize: '30px', fill: '#fff', stroke:'#000', strokeThickness:5 }).setOrigin(0.5);
        const btnW = w*0.32, btnH = h*0.38;
        // İsrail
        const israelBtn = this.add.image(w*0.35, btnH, 'israel_bg').setDisplaySize(180,120).setInteractive();
        this.add.text(w*0.35, btnH+80, 'Defend Israel', { fontSize: '18px', fill:'#fff', stroke:'#000', strokeThickness:4 }).setOrigin(0.5);
        // İran
        const iranBtn = this.add.image(w*0.65, btnH, 'iran_bg').setDisplaySize(180,120).setInteractive();
        this.add.text(w*0.65, btnH+80, 'Defend Iran', { fontSize: '18px', fill:'#fff', stroke:'#000', strokeThickness:4 }).setOrigin(0.5);

        israelBtn.on('pointerdown', ()=>{ selectedSide='israel'; this.scene.start('LobbyScene'); });
        iranBtn.on('pointerdown', ()=>{ selectedSide='iran'; this.scene.start('LobbyScene'); });
    }
}

// ------ Lobi (Oyun Öncesi) ------
class LobbyScene extends Phaser.Scene {
    constructor() { super('LobbyScene'); }
    create() {
        const w = this.cameras.main.width, h = this.cameras.main.height;
        this.add.image(w/2, h/2, selectedSide+'_bg').setDisplaySize(w, h);

        this.add.text(w/2, h*0.12, `Welcome, ${currentUser.first_name}!`, { fontSize:'28px', fill:'#fff', stroke:'#000', strokeThickness:4 }).setOrigin(0.5);
        this.add.text(w/2, h*0.18, `Side: ${selectedSide.toUpperCase()}`, { fontSize:'22px', fill:'#fff', stroke:'#000', strokeThickness:3 }).setOrigin(0.5);

        let highScoreText = this.add.text(w*0.3, h*0.3, 'Loading...', { fontSize:'20px', fill:'#fff' }).setOrigin(0,0.5);
        let totalScoreText = this.add.text(w*0.3, h*0.38, '', { fontSize:'20px', fill:'#fff' }).setOrigin(0,0.5);
        let coinsText = this.add.text(w*0.3, h*0.46, '', { fontSize:'20px', fill:'#fff' }).setOrigin(0,0.5);

        if (db && currentUser) {
            db.collection('users').doc(String(currentUser.id)).get().then(doc=>{
                let d = doc.exists ? doc.data() : { score:0, total_score:0, total_pmno_coins:0 };
                currentHighScore = d.score || 0;
                highScoreText.setText(`Max Score: ${d.score||0}`);
                totalScoreText.setText(`Total Score: ${d.total_score||0}`);
                coinsText.setText(`Coins: ${d.total_pmno_coins||0}`);
            });
            db.collection('users').orderBy('score','desc').limit(1).get().then(q=>{
                q.forEach(doc=>{ leaderboardTopScore=doc.data().score||0; });
            });
        }

        const playBtn = this.add.image(w/2, h*0.80, 'play_button').setDisplaySize(220, 80).setInteractive();
        playBtn.on('pointerdown', ()=> this.scene.start('GameScene'));

        // Menüde diğer bölümler
        this.add.text(w/2, h*0.91, 'Leaderboard | Game Info', { fontSize:'16px', fill:'#fff', backgroundColor:'#111b' }).setOrigin(0.5);
    }
}

// ------ Oyun Sahnesi ------
class GameScene extends Phaser.Scene {
    constructor() { super('GameScene'); }
    create() {
        this.score = 0;
        this.gameOver = false;
        this.bombInterval = 1100;
        this.buildings = [];
        const w = this.cameras.main.width, h = this.cameras.main.height;

        // Arka plan
        this.add.image(w/2, h/2, selectedSide+'_bg').setDisplaySize(w, h);

        // Bina koordinatları (örnek: 3 bina, istediğin gibi çoğaltabilirsin)
        const buildingsData = [
            {x:w*0.25, y:h*0.8}, {x:w*0.5, y:h*0.75}, {x:w*0.75, y:h*0.8}
        ];
        for(let b of buildingsData){
            let building = this.add.rectangle(b.x, b.y, 90, 100, 0x888888).setOrigin(0.5,1);
            building.health = 3; // her bina 3 can
            building.d = b; // data
            this.buildings.push(building);
        }

        // Skor alanı
        this.scoreText = this.add.text(18, 16, "Score: 0", { fontSize: '22px', fill:'#fff', stroke:'#000', strokeThickness:4 });

        // Bombalar
        this.rockets = this.physics.add.group();
        this.time.addEvent({ delay:this.bombInterval, callback:()=>this.spawnRocket(), callbackScope:this, loop:true });

        // Çarpışma
        this.physics.add.overlap(this.rockets, this.buildings, this.hitBuilding, null, this);
    }

    spawnRocket() {
        if(this.gameOver) return;
        const w = this.cameras.main.width, h = this.cameras.main.height;
        const startEdge = Phaser.Math.Between(0,2); // 0: yukarı, 1: sol, 2: sağ
        let startX, startY, targetB = Phaser.Utils.Array.GetRandom(this.buildings.filter(b=>b.health>0));
        if(!targetB) return;
        let tx = targetB.x, ty = targetB.y-45;
        if(startEdge==0) { startX=Phaser.Math.Between(40,w-40); startY=-60; }
        else if(startEdge==1) { startX=-60; startY=Phaser.Math.Between(80,h*0.7); }
        else { startX=w+60; startY=Phaser.Math.Between(80,h*0.7); }

        let rocket = this.rockets.create(startX, startY, 'rocket').setScale(0.7).setAngle(Phaser.Math.Between(0,360));
        this.physics.moveTo(rocket, tx, ty, Phaser.Math.Between(250,340));
        rocket.setInteractive();
        rocket.on('pointerdown', ()=>this.destroyRocket(rocket));
    }

    destroyRocket(rocket) {
        if(!rocket.active||this.gameOver) return;
        this.score += 10; this.scoreText.setText("Score: "+this.score);
        let explosion = this.add.image(rocket.x, rocket.y, "explosion").setScale(1.4);
        let dove = this.add.image(rocket.x, rocket.y, "dove").setScale(0.5);
        this.tweens.add({ targets:dove, y:dove.y-90, alpha:0, duration:850, onComplete:()=>dove.destroy() });
        this.time.delayedCall(180, ()=>explosion.destroy());
        rocket.destroy();
    }

    hitBuilding(rocket, building) {
        if(this.gameOver||building.health<=0) return;
        rocket.destroy();
        building.health--;
        if(building.health<=0) {
            this.add.image(building.x, building.y-40, "destroyed_building").setScale(0.6);
        }
        if(this.buildings.filter(b=>b.health>0).length==0) this.finishGame();
    }

    finishGame() {
        this.gameOver = true;
        // YENİ REKOR/BONUS HESAP
        let bonus = 0, msg = '';
        if(this.score > currentHighScore) {
            bonus = this.score * 100; msg = 'New Score! +' + bonus;
            if(this.score > leaderboardTopScore) { // global 1. oldun
                bonus = this.score * 250; msg = 'NEW GLOBAL #1! +' + bonus;
            }
        }
        this.add.text(this.cameras.main.width/2, this.cameras.main.height/2, msg+'\nScore: '+this.score, { fontSize:'34px', fill:'#FFD700', stroke:'#000', strokeThickness:7 }).setOrigin(0.5);
        // Bot’a skoru gönder
        if(window.tg && window.tg.sendData){
            tg.sendData(JSON.stringify({ type: "score_update", user_id: String(currentUser.id), score: this.score }));
        }
        this.time.delayedCall(3500, ()=>this.scene.start('LobbyScene'));
    }
}

const config = {
    type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight,
    scene: [Preloader, SideSelectionScene, LobbyScene, GameScene],
    physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};

window.addEventListener('load', ()=>{ game = new Phaser.Game(config); });
window.addEventListener('resize', ()=>{
    if(game){ game.scale.resize(window.innerWidth, window.innerHeight); }
});
