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

// --- Telegram & Firestore Setup ---
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
  const snap = await db.collection("users").doc(String(currentUser.id)).get();
  if (snap.exists) userStats = snap.data();
}

async function fetchLeaderboard() {
  const snap = await db.collection("users").orderBy("total_score", "desc").limit(5).get();
  return snap.docs.map(d => d.data());
}

const MEME_MESSAGES = [
  { text: "Dove: 'One more step for peace!'", img: "dove_peace" },
  { text: "Peace Bro: 'Kid, you rock!'",    img: "peace_bro" },
  { text: "Missile turned into a dove!",     img: "missile_to_dove" },
  { text: "Bombs out, peace in!",            img: "twitter_bird" },
  { text: "Everyone for peace!",             img: "crowd_peace" },
];

const buildingData = {
  iran:   [{x:100,y:400}, /* ... 9 daha ... */],
  israel:[{x:120,y:480}, /* ... 9 daha ... */]
};
const BUILDING_HEALTH = 2;

const assets = {
  iran_bg: 'assets/iran_bg.jpg',
  israel_bg: 'assets/israel_bg.jpg',
  lobby_bg: 'assets/lobby_bg.png',
  logo: 'assets/logo.png',
  destroyed_building:'assets/destroyed_building.png',
  rocket:'assets/rocket.png',
  explosion:'assets/explosion.gif',
  dove:  'assets/dove.png',
  coin_icon:'assets/coin_icon.png',
  score_icon:'assets/score_icon.png',
  button:'assets/play_button.png',
  building_bar:'assets/score.png',
  smoke:'assets/smoke_sheet.png',
  dove_peace:'assets/dove_peace.png',
  peace_bro:'assets/peace_bro.png',
  missile_to_dove:'assets/missile_to_dove.png',
  twitter_bird:'assets/twitter_bird.png',
  crowd_peace:'assets/crowd_peace.png',
};

// --- Phaser Config ---
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
new Phaser.Game(config);

// --- Scenes & Helper ---
function getScaleVars(scene) {
  const w = scene.cameras.main.width, h = scene.cameras.main.height;
  return {
    w,h,
    fontBig:   Math.max(Math.round(w/20),18),
    fontMid:   Math.max(Math.round(w/25),15),
    fontSmall: Math.max(Math.round(w/32),12),
    btnScale:  Math.max(w/1400,0.33),
    logoScale: Math.max(w/700,0.21),
    topPanelW: Math.min(w*0.55,330),
    margin:    Math.max(w/48,10),
  };
}

class BootScene extends Phaser.Scene {
  constructor(){ super('BootScene'); }
  preload(){
    for (let key in assets) this.load.image(key, assets[key]);
    this.load.spritesheet('explosion', assets.explosion, {frameWidth:64,frameHeight:64});
    this.load.spritesheet('smoke',     assets.smoke,     {frameWidth:128,frameHeight:128});
  }
  create(){ this.scene.start('LobbyScene'); }
}

class LobbyScene extends Phaser.Scene {
  constructor(){ super('LobbyScene'); }
  async create(){
    const vars = getScaleVars(this);

    // 0) Yarı saydam overlay
    const ov = this.add.graphics().fillStyle(0x000000,0.6).fillRect(0,0,vars.w,vars.h);
    // 1) Arkaplan
    this.add.image(vars.w/2,vars.h/2,'lobby_bg').setDisplaySize(vars.w,vars.h).setDepth(-2);

    // 2) UI container
    const ui = this.add.container(vars.w/2, vars.h/2);

    await fetchUserStats();

    // Başlık
    const title = this.add.text(0, -vars.h/2+30, `Welcome, ${userStats.username}!`, {
      font:`bold ${vars.fontMid+4}px monospace`, fill:'#fff'
    }).setOrigin(0.5,0);
    ui.add(title);

    // Skorlar
    const lines = [
      `Max Score: ${userStats.score}`,
      `Total Score: ${userStats.total_score}`,
      `PMNOFO Coins: ${userStats.total_pmno_coins}`
    ];
    lines.forEach((t,i)=>{
      ui.add(this.add.text(0,
        title.y+title.height+8+i*(vars.fontSmall+6),
        t,{font:`${vars.fontSmall}px monospace`,fill:'#ffe349'}
      ).setOrigin(0.5,0));
    });

    // Leaderboard başlığı
    const lbY = title.y+title.height+8+lines.length*(vars.fontSmall+6)+16;
    const lbTitle = this.add.text(0, lbY, 'Top Players', {
      font:`bold ${vars.fontMid}px monospace`, fill:'#fff'
    }).setOrigin(0.5,0);
    ui.add(lbTitle);

    // Lider listesi
    const leaders = (await fetchLeaderboard()).slice(0,5);
    leaders.forEach((u,i)=>{
      ui.add(this.add.text(0,
        lbTitle.y+lbTitle.height+8+i*(vars.fontSmall+6),
        `${i+1}. ${u.username||'Anon'} — ${u.total_score} pts`,
        {font:`${vars.fontSmall}px monospace`,fill:'#fff'}
      ).setOrigin(0.5,0));
    });

    // START butonu
    const btn = this.add.image(0, vars.h/2-80,'button')
      .setScale(vars.btnScale).setInteractive()
      .on('pointerup',()=>this.scene.start('SideSelectScene'));
    ui.add(btn);

    // Alt linkler
    const menuY = btn.y+btn.displayHeight/2+16;
    ui.add(this.add.text(-60,menuY,'Leaderboard',{font:`${vars.fontSmall}px monospace`,fill:'#ffe349'})
      .setOrigin(0.5,0)
      .setInteractive().on('pointerup',()=>this.scene.start('LeaderboardScene')) );
    ui.add(this.add.text(60,menuY,'How to Play?',{font:`${vars.fontSmall}px monospace`,fill:'#43c0f7'})
      .setOrigin(0.5,0)
      .setInteractive().on('pointerup',()=>this.scene.start('HowToPlayScene')) );

    // Alt logo
    ui.add(this.add.image(0, vars.h/2-30,'logo').setScale(vars.logoScale*0.6));
  }
}

class SideSelectScene extends Phaser.Scene {
  constructor(){ super('SideSelectScene'); }
  create(){
    this.cameras.main.setBackgroundColor("#000");
    const cx = this.cameras.main.centerX, cy=120;
    this.add.text(cx,cy,"Choose your side",{font:'32px monospace',color:'#fff'}).setOrigin(0.5);
    const iran = this.add.image(cx-100,250,'iran_bg').setDisplaySize(120,160).setInteractive();
    this.add.text(cx-100,335,"Defend Iran",{font:'20px monospace',color:'#fff'}).setOrigin(0.5,0);
    const isr = this.add.image(cx+100,250,'israel_bg').setDisplaySize(120,160).setInteractive();
    this.add.text(cx+100,335,"Defend Israel",{font:'20px monospace',color:'#fff'}).setOrigin(0.5,0);

    iran.on('pointerdown',()=>this.scene.start('GameScene',{side:'iran'}));
    isr.on('pointerdown',()=>this.scene.start('GameScene',{side:'israel'}));
  }
}

class GameScene extends Phaser.Scene {
  constructor(){ super('GameScene'); }
  create(data){
    const vars = getScaleVars(this);
    const side = data.side||'israel';

    // Zemin
    this.add.image(vars.w/2,vars.h/2, side==='iran'?'iran_bg':'israel_bg')
        .setDisplaySize(vars.w,vars.h);

    // Binalar
    this.buildings = [];
    buildingData[side].forEach(b=>{
      const rect = this.add.rectangle(b.x,b.y,50,60,0xffffff,0.01).setInteractive();
      rect.health=BUILDING_HEALTH; rect.alive=true;
      rect.healthBar=this.add.graphics();
      this.buildings.push(rect);
      this.updateHealthBar(rect);
    });

    // Skor
    this.score=0; this.rocketCount=0;
    this.nextMemeAt=Phaser.Math.Between(8,12);
    this.bombSpawnDelay=1100; this.bombSpeedMultiplier=1;
    this.doubleScoreActive=false;
    this.scoreText = this.add.text(30,20,'Score: 0',{font:'24px monospace',color:'#fff'});

    // Aylık görev vb. (aynı)
    // …

    // Timer’lar
    this.startBombTimer();
    this.time.addEvent({
      delay: Phaser.Math.Between(30000,60000),
      loop: true,
      callback:()=>this.spawnPowerUp(),
      callbackScope:this
    });
  }

  startBombTimer(){
    this.bombTimer = this.time.addEvent({
      delay:this.bombSpawnDelay, loop:true,
      callback:()=>{
        if(!this.gameOver){
          this.rocketCount++;
          this.adjustDifficulty();
          this.spawnBomb();
          this.bombTimer.reset({delay:this.bombSpawnDelay});
        }
      },
      callbackScope:this
    });
  }

  adjustDifficulty(){
    [0,20,50,100,150,200].reverse().forEach((c,i)=>{
      if(this.rocketCount>=[0,20,50,100,150,200][i]){
        const lvl=[{delay:1100,speed:1},{delay:950,speed:1.15},{delay:800,speed:1.3},
                   {delay:650,speed:1.5},{delay:500,speed:1.8},{delay:390,speed:2.1}][i];
        this.bombSpawnDelay=lvl.delay;
        this.bombSpeedMultiplier=lvl.speed;
      }
    });
  }

  getDynamicScore(idx){
    const tbl=[{max:20,min:7,maxP:10},{max:70,min:5,maxP:8},{max:999,min:3,maxP:6}];
    for(let i=0;i<tbl.length;i++){
      if(idx<=tbl[i].max)
        return Phaser.Math.Between(tbl[i].min,tbl[i].maxP);
    }
    return 3;
  }

  spawnBomb(){
    const live = this.buildings.filter(b=>b.alive);
    if(!live.length) return;
    const target = Phaser.Utils.Array.GetRandom(live);
    let x,y,vx,vy;
    if(Math.random()<0.25){
      const sideLeft=Math.random()<0.5;
      const offsetY=Phaser.Math.Between(100,180);
      if(sideLeft){
        x=-40; y=Math.max(target.y-offsetY,30);
        vx=Phaser.Math.Between(150,230)*this.bombSpeedMultiplier;
        vy=Phaser.Math.Between(100,200)*this.bombSpeedMultiplier;
      } else {
        x=this.cameras.main.width+40; y=Math.max(target.y-offsetY,30);
        vx=-Phaser.Math.Between(150,230)*this.bombSpeedMultiplier;
        vy=Phaser.Math.Between(100,200)*this.bombSpeedMultiplier;
      }
    } else {
      x=target.x; y=-60; vx=0;
      vy=Phaser.Math.Between(170,240)*this.bombSpeedMultiplier;
    }
    const bomb = this.physics.add.sprite(x,y,'rocket').setDisplaySize(32,50).setInteractive();
    bomb.vx=vx/1000; bomb.vy=vy/1000; bomb.target=target;
    bomb.rotation=Math.atan2(bomb.vy,bomb.vx)+Math.PI/2;
    bomb.on('pointerdown',()=>this.bombExplode(bomb,false));
    this.bombs = this.bombs||[]; this.bombs.push(bomb);
  }

  update(time,delta){
    (this.bombs||[]).forEach(b=>{
      if(!b.active) return;
      b.x+=b.vx*delta; b.y+=b.vy*delta;
      if(b.target && b.target.alive &&
         Phaser.Geom.Rectangle.Contains(b.target.getBounds(),b.x,b.y)){
        this.bombExplode(b,true);
      }
      if(b.y>this.cameras.main.height+60||b.x<-40||b.x>this.cameras.main.width+40){
        b.destroy();
      }
    });
    this.bombs = (this.bombs||[]).filter(b=>b.active);
    this.buildings.forEach(b=>this.updateHealthBar(b));
  }

  updateHealthBar(b){
    if(!b.healthBar) return;
    b.healthBar.clear();
    if(!b.alive) return;
    const w=38,h=7;
    b.healthBar.fillStyle(0x008800,0.7)
      .fillRect(b.x-w/2,b.y-36,w*(b.health/BUILDING_HEALTH),h)
      .lineStyle(1,0xffffff,1)
      .strokeRect(b.x-w/2,b.y-36,w,h);
  }

  bombExplode(bomb,isHit){
    if(!bomb.active) return;
    const exp = this.add.sprite(bomb.x,bomb.y,'explosion').setScale(0.8);
    this.time.delayedCall(400,()=>exp.destroy());

    if(!isHit){
      const dove = this.add.image(bomb.x,bomb.y,'dove').setScale(0.35);
      this.tweens.add({targets:dove,y:dove.y-80,alpha:0,duration:700,onComplete:()=>dove.destroy()});

      let pts = this.getDynamicScore(this.rocketCount);
      if(this.doubleScoreActive) pts*=2;
      this.score+=pts;
      this.scoreText.setText(`Score: ${this.score}`);
      // görev
      // ...
      // meme  
      if(this.rocketCount>=this.nextMemeAt){
        this.showRandomMeme();
        this.nextMemeAt = this.rocketCount + Phaser.Math.Between(8,12);
      }
    } else {
      const b = bomb.target;
      if(b.alive){
        b.health--; if(b.health<=0){
          b.alive=false;
          this.add.image(b.x,b.y+15,'destroyed_building').setDisplaySize(90,100);
          const s = this.add.sprite(b.x,b.y-10,'smoke').setScale(0.7);
          this.time.delayedCall(900,()=>s.destroy());
          showSmoke(this,b.x,b.y-20);
        }
        if(!this.buildings.some(bb=>bb.alive)){
          this.gameOver=true;
          const coins = Math.floor(this.score/10);
          this.scene.start('GameOverScene',{score:this.score,coins});
        }
      }
    }
    bomb.destroy();
  }

  showRandomMeme(){
    const m = Phaser.Utils.Array.GetRandom(MEME_MESSAGES);
    const cx = this.cameras.main.centerX;
    const img = this.add.image(cx,60,m.img).setScale(0.7).setOrigin(0.5,0);
    const txt = this.add.text(cx, img.y+img.displayHeight+8, m.text, {
      font:"18px monospace", fill:"#fff", backgroundColor:"#1a1a1ac9",
      align:"center", padding:{left:8,right:8,top:2,bottom:2}, wordWrap:{width:260}
    }).setOrigin(0.5,0);
    this.time.delayedCall(2300,()=>{
      img.destroy(); txt.destroy();
    });
  }
}

class GameOverScene extends Phaser.Scene {
  constructor(){ super('GameOverScene'); }
  async create(data){
    this.cameras.main.setBackgroundColor("#222");
    this.add.text(this.cameras.main.centerX,200,"Game Over!",{font:'36px monospace',color:'#fff'}).setOrigin(0.5);
    this.add.text(this.cameras.main.centerX,250,`Score: ${data.score}`,{font:'28px monospace',color:'#ffd'}).setOrigin(0.5);
    this.add.text(this.cameras.main.centerX,290,`PMNOFO Coin: ${data.coins}`,{font:'24px monospace',color:'#3f6'}).setOrigin(0.5);
    sendScoreToBot(data.score);
    const btn = this.add.text(this.cameras.main.centerX,360,"Play Again",{font:'24px monospace',color:'#1df',backgroundColor:'#133'})
      .setOrigin(0.5).setPadding(10).setInteractive()
      .on('pointerdown',()=>this.scene.start('LobbyScene'));
  }
}

class HowToPlayScene extends Phaser.Scene {
  constructor(){ super('HowToPlayScene'); }
  create(){
    const vars = getScaleVars(this);
    this.add.rectangle(vars.w/2,vars.h/2,vars.w,vars.h,0x000000,0.93);
    this.add.text(vars.w/2,vars.h*0.1,"Amaç ve Kurallar",{font:`${vars.fontBig}px monospace`,fill:'#fff'}).setOrigin(0.5,0);
    const msg = "🕊️ Welcome to Peace Missile! 🕊️\n\n" +
      "Turn missiles into doves and bring peace.\n" +
      "Each conversion earns points and coins.\n" +
      "Beat your record or the leader!";
    this.add.text(vars.w/2,vars.h*0.17,msg,{font:`${vars.fontSmall+3}px monospace`,fill:'#fff',align:'center',wordWrap:{width:vars.w*0.8}}).setOrigin(0.5,0);
    this.add.text(vars.w/2,vars.h-80,"< Back",{font:`${vars.fontMid}px monospace`,fill:'#67f'})
      .setOrigin(0.5).setInteractive().on('pointerup',()=>this.scene.start('LobbyScene'));
  }
}

class LeaderboardScene extends Phaser.Scene {
  constructor(){ super('LeaderboardScene'); }
  async create(){
    const vars = getScaleVars(this);
    this.add.rectangle(vars.w/2,vars.h/2,vars.w,vars.h,0x000000,0.93);
    this.add.text(vars.w/2,vars.h*0.11,"Leaderboard",{font:`${vars.fontBig}px monospace`,fill:'#ffe349'}).setOrigin(0.5,0);
    const leaders = await fetchLeaderboard();
    leaders.forEach((u,i)=>{
      this.add.text(vars.w/2, vars.h*0.17 + i* (vars.fontSmall+16),
        `${i+1}. ${u.username||'Anon'} — ${u.total_score} pts`,
        {font:`${vars.fontSmall+4}px monospace`,fill:'#fff'}
      ).setOrigin(0.5,0);
    });
    this.add.text(vars.w/2,vars.h-80,"< Back",{font:`${vars.fontMid}px monospace`,fill:'#67f'})
      .setOrigin(0.5).setInteractive().on('pointerup',()=>this.scene.start('LobbyScene'));
  }
}

function showSmoke(scene,x,y){
  const s = scene.add.image(x,y,'destroyed_building').setScale(0.17).setAlpha(0.9);
  scene.tweens.add({targets:s,y:y-25,scale:0.23,alpha:0,duration:1700,onComplete:()=>s.destroy()});
}

function sendScoreToBot(score){
  const u = window.Telegram.WebApp.initDataUnsafe.user;
  fetch('https://peacebot-641906716058.europe-central2.run.app/save_score',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      user_id: u?.id?.toString()||'anon',
      username: u?.username||'Player',
      score
    })
  });
}
