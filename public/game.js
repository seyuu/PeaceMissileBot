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

async function fetchUserStats() {
  if (!currentUser) return { username: "Player", score: 0, total_score: 0, total_pmno_coins: 0 };
  const ref = db.collection("users").doc(String(currentUser.id));
  const snap = await ref.get();
  return snap.exists ? snap.data() : { username: "Player", score: 0, total_score: 0, total_pmno_coins: 0 };
}

async function fetchLeaderboard() {
  const snap = await db.collection("users").orderBy("total_score", "desc").limit(5).get();
  return snap.docs.map(doc => doc.data());
}

const MEME_MESSAGES = [
  { text: "Dove: 'One more step for peace!'",        img: "dove_peace" },
  { text: "Peace Bro: 'Kid, you rock!'",             img: "peace_bro" },
  { text: "Missile turned into a dove. Classic!",    img: "missile_to_dove" },
  { text: "Tweet tweet! Bombs out, peace in!",       img: "twitter_bird" },
  { text: "Everyone for peace!",                     img: "crowd_peace" }
];

// --- Constants & Assets ---
const BUILDING_HEALTH = 2;
const POWERUP_TYPES   = ["extra_dove","double_score","slow_rockets","freeze"];
const buildingData = {
  iran: [
    {x:100,y:400},{x:170,y:410},{x:260,y:410},{x:60,y:470},
    {x:140,y:520},{x:260,y:520},{x:320,y:470},{x:320,y:560},
    {x:100,y:580},{x:250,y:620}
  ],
  israel:[
    {x:120,y:480},{x:210,y:430},{x:270,y:480},{x:80,y:550},
    {x:170,y:530},{x:250,y:550},{x:320,y:540},{x:360,y:600},
    {x:120,y:640},{x:230,y:670}
  ]
};
const assets = {
  iran_bg:'assets/iran_bg.jpg', israel_bg:'assets/israel_bg.jpg',
  lobby_bg:'assets/lobby_bg.png', logo:'assets/logo.png',
  destroyed_building:'assets/destroyed_building.png',
  rocket:'assets/rocket.png', explosion:'assets/explosion.gif',
  dove:'assets/dove.png', coin_icon:'assets/coin_icon.png',
  score_icon:'assets/score_icon.png', button:'assets/play_button.png',
  building_bar:'assets/score.png', smoke:'assets/smoke_sheet.png',
  dove_peace:'assets/dove_peace.png', peace_bro:'assets/peace_bro.png',
  missile_to_dove:'assets/missile_to_dove.png',
  twitter_bird:'assets/twitter_bird.png', crowd_peace:'assets/crowd_peace.png'
};

// --- Helper: Responsive Scaling ---
function getScaleVars(scene) {
  const w = scene.cameras.main.width,
        h = scene.cameras.main.height;
  return {
    w, h,
    fontBig:   Math.max(Math.round(w/20),  18),
    fontMid:   Math.max(Math.round(w/25),  15),
    fontSmall: Math.max(Math.round(w/32),  12),
    btnScale:  Math.max(w/1400,           0.33),
    logoScale: Math.max(w/700,            0.21),
    topPanelW: Math.min(w*0.55,           330),
    margin:    Math.max(w/48,             10)
  };
}

// --- BootScene: preload all assets ---
class BootScene extends Phaser.Scene {
  constructor(){ super('BootScene'); }
  preload(){
    for (let key in assets) {
      if (key.endsWith('_bg') || key==='lobby_bg' || key==='logo' ||
          key==='destroyed_building' || key==='rocket'  ||
          key==='dove' || key==='coin_icon' || key==='score_icon' ||
          key==='button' || key==='building_bar') {
        this.load.image(key, assets[key]);
      }
    }
    ['dove_peace','peace_bro','missile_to_dove','twitter_bird','crowd_peace']
      .forEach(k => this.load.image(k, assets[k]));
    this.load.spritesheet('explosion', assets.explosion, { frameWidth:64, frameHeight:64 });
    this.load.spritesheet('smoke',     assets.smoke,     { frameWidth:128, frameHeight:128});
  }
  create(){ this.scene.start('LobbyScene'); }
}

// --- LobbyScene: Welcome & Leaderboard Preview ---
class LobbyScene extends Phaser.Scene {
  constructor(){ super('LobbyScene'); }
  async create(){
    const vars = getScaleVars(this);
    this.add.image(vars.w/2, vars.h/2, 'lobby_bg').setDisplaySize(vars.w, vars.h);

    // user stats
    const s = await fetchUserStats();
    let x0 = vars.margin, y0 = vars.margin, c = "#ffe349";
    this.add.text(x0, y0, `Welcome, ${s.username}!`, { font:`${vars.fontSmall+2}px monospace`, fill:'#fff' }).setOrigin(0);
    this.add.text(x0, y0 += vars.fontSmall+8, `Max Score: ${s.score}`,           { font:`${vars.fontSmall}px monospace`, fill:c }).setOrigin(0);
    this.add.text(x0, y0 += vars.fontSmall+4, `Total Score: ${s.total_score}`,    { font:`${vars.fontSmall}px monospace`, fill:c }).setOrigin(0);
    this.add.text(x0, y0 += vars.fontSmall+4, `PMNOFO Coins: ${s.total_pmno_coins}`,{ font:`${vars.fontSmall}px monospace`, fill:c }).setOrigin(0);

    // Start Mission button
    const btnY = vars.h * 0.6;
    const startBtn = this.add.image(vars.w/2, btnY, 'button').setScale(vars.btnScale).setInteractive();
    startBtn.on('pointerup', () => this.scene.start('SideSelectScene'));

    // Top 5 preview
    this.add.text(vars.w/2, btnY - 300, "Top Players", { font:`bold ${vars.fontMid+2}px monospace`, fill:'#ffe349' }).setOrigin(0.5,0);
    const leaders = await fetchLeaderboard();
    leaders.forEach((u,i) => {
      this.add.text(vars.w/2, btnY - 300 + (i+1)*(vars.fontSmall+8),
        `${i+1}. ${u.username} - ${u.total_score} pts`,
        { font:`${vars.fontSmall+2}px monospace`, fill:'#fff' }
      ).setOrigin(0.5,0);
    });

    // bottom links
    const menuY = btnY + startBtn.displayHeight/2 + 28;
    this.add.text(vars.w/4, menuY, "Leaderboard", { font:`${vars.fontMid}px monospace`, fill:'#ffe349' })
      .setOrigin(0.5).setInteractive().on('pointerup', ()=>this.scene.start('LeaderboardScene'));
    this.add.text(vars.w - vars.w/4, menuY, "How to Play?", { font:`${vars.fontMid}px monospace`, fill:'#43c0f7' })
      .setOrigin(0.5).setInteractive().on('pointerup', ()=>this.scene.start('HowToPlayScene'));

    this.add.image(vars.w/2, vars.h - 95, 'logo').setScale(vars.logoScale/2);
  }
}

// --- SideSelectScene: pick Iran or Israel ---
class SideSelectScene extends Phaser.Scene {
  constructor(){ super('SideSelectScene'); }
  create(){
    this.cameras.main.setBackgroundColor("#000");
    this.add.text(this.cameras.main.centerX,120,"Choose your side",{ font:'32px monospace', fill:'#fff' }).setOrigin(0.5);
    // Iran
    let iran = this.add.image(this.cameras.main.centerX-100,250,'iran_bg').setDisplaySize(120,160).setInteractive();
    this.add.text(iran.x, iran.y+85, "Defend Iran", { font:'20px monospace', fill:'#fff' }).setOrigin(0.5);
    // Israel
    let isr = this.add.image(this.cameras.main.centerX+100,250,'israel_bg').setDisplaySize(120,160).setInteractive();
    this.add.text(isr.x, isr.y+85, "Defend Israel", { font:'20px monospace', fill:'#fff' }).setOrigin(0.5);
    iran.on('pointerdown', () => this.scene.start('GameScene',{ side:'iran' }));
    isr.on('pointerdown', () => this.scene.start('GameScene',{ side:'israel' }));
  }
}

// --- GameScene: actual play, bombs & memes ---
class GameScene extends Phaser.Scene {
  constructor(){ super('GameScene'); }
  create(data){
    const {w,h} = getScaleVars(this);
    this.side = data.side || 'israel';
    // background
    this.add.image(w/2,h/2,this.side+'_bg').setDisplaySize(w,h);

    // buildings
    this.buildings = [];
    buildingData[this.side].forEach(b => {
      let r = this.add.rectangle(b.x,b.y,50,60,0xffffff,0.01).setInteractive();
      r.health = BUILDING_HEALTH; r.alive = true; r.healthBar = this.add.graphics();
      this.buildings.push(r); this.updateHealthBar(r);
    });

    // score text
    this.score = 0; 
    this.scoreText = this.add.text(30,20,'Score: 0',{ font:'24px monospace', fill:'#fff' });

    // difficulty & meme timing
    this.rocketCount = 0;
    this.bombSpawnDelay = 1100;
    this.bombSpeedMultiplier = 1;
    this.doubleScoreActive = false;
    this.nextMemeAt = Phaser.Math.Between(8,12);

    // spawn power-ups periodically
    this.time.addEvent({ delay: Phaser.Math.Between(30000,60000), callback:this.spawnPowerUp, callbackScope:this, loop:true });

    // start dropping bombs
    this.startBombTimer();

    this.gameOver = false;
  }

  startBombTimer(){
    this.bombTimer = this.time.addEvent({
      delay: this.bombSpawnDelay,
      callback: ()=>{
        if(this.gameOver) return;
        this.rocketCount++;
        this.adjustDifficulty();
        this.spawnBomb();
        this.bombTimer.reset({ delay:this.bombSpawnDelay, callback:this.bombTimer.callback, callbackScope:this });
      },
      loop:true
    });
  }

  adjustDifficulty(){
    const levels = [
      {count:0,  delay:1100, speed:1.00},
      {count:20, delay:950,  speed:1.15},
      {count:50, delay:800,  speed:1.30},
      {count:100,delay:650,  speed:1.50},
      {count:150,delay:500,  speed:1.80},
      {count:200,delay:390,  speed:2.10}
    ];
    for(let i=levels.length-1;i>=0;i--){
      if(this.rocketCount>=levels[i].count){
        this.bombSpawnDelay = levels[i].delay;
        this.bombSpeedMultiplier = levels[i].speed;
        break;
      }
    }
  }

  getDynamicScore(idx){
    const table = [
      {max:20,  min:7, maxP:10},
      {max:70,  min:5, maxP:8},
      {max:999, min:3, maxP:6}
    ];
    for(let g of table){
      if(idx<=g.max) return Phaser.Math.Between(g.min,g.maxP);
    }
    return 3;
  }

  spawnBomb(){
    if(this.gameOver) return;
    let live = this.buildings.filter(b=>b.alive);
    if(!live.length) return;
    let target = Phaser.Utils.Array.GetRandom(live);
    let fromSide = Math.random()<0.25, x,y,vx,vy;
    if(!fromSide){
      x=target.x; y=-60; vx=0; vy=Phaser.Math.Between(170,240)*this.bombSpawnMultiplier;
    } else {
      let left = Math.random()<0.5, off = Phaser.Math.Between(100,180);
      if(left){
        x=-40; y=Math.max(target.y-off,30);
        vx=Phaser.Math.Between(150,230)*this.bombSpawnMultiplier;
        vy=Phaser.Math.Between(100,200)*this.bombSpawnMultiplier;
      } else {
        x=this.cameras.main.width+40;
        y=Math.max(target.y-off,30);
        vx=-Phaser.Math.Between(150,230)*this.bombSpawnMultiplier;
        vy=Phaser.Math.Between(100,200)*this.bombSpawnMultiplier;
      }
    }
    let bomb = this.physics.add.sprite(x,y,'rocket').setDisplaySize(32,50).setInteractive();
    bomb.target=target; bomb.vx=vx/1000; bomb.vy=vy/1000;
    bomb.rotation=Math.atan2(bomb.vy,bomb.vx)+Math.PI/2;
    bomb.on('pointerdown', ()=>this.bombExplode(bomb,false));
  }

  update(time,delta){
    if(this.gameOver) return;
    this.physics.world.bodies.entries.forEach(body=>{
      if(body.gameObject.texture.key==='rocket'){
        let b = body.gameObject;
        b.x += b.vx * delta; b.y += b.vy * delta;
        if(b.target.alive && Phaser.Geom.Rectangle.Contains(b.target.getBounds(),b.x,b.y)){
          this.bombExplode(b,true);
        }
        if(b.y>this.cameras.main.height+60||b.x<-40||b.x>this.cameras.main.width+40) b.destroy();
      }
    });
    this.buildings.forEach(b=>this.updateHealthBar(b));
  }

  bombExplode(bomb,isHit){
    if(!bomb.active) return;
    let exp = this.add.sprite(bomb.x,bomb.y,'explosion').setScale(0.8);
    this.time.delayedCall(400,()=>exp.destroy());

    if(!isHit){
      let d = this.add.image(bomb.x,bomb.y,'dove').setScale(0.35);
      this.tweens.add({targets:d,y:d.y-80,alpha:0,duration:700,onComplete:()=>d.destroy()});
      let sc = this.getDynamicScore(this.rocketCount);
      if(this.doubleScoreActive) sc*=2;
      this.score += sc;
      this.scoreText.setText(`Score: ${this.score}`);

      if(this.rocketCount >= this.nextMemeAt){
        this.showRandomMeme();
        this.nextMemeAt = this.rocketCount + Phaser.Math.Between(8,12);
      }
    } else {
      let bld = bomb.target;
      if(bld.alive){
        bld.health--;
        if(bld.health<=0){
          bld.alive=false;
          this.add.image(bld.x,bld.y+15,'destroyed_building').setDisplaySize(90,100);
          let sm = this.add.sprite(bld.x,bld.y-10,'smoke').setScale(0.7);
          this.time.delayedCall(900,()=>sm.destroy());
        }
        if(!this.buildings.some(bb=>bb.alive)){
          this.gameOver=true;
          let coins = Math.floor(this.score/10);
          this.scene.start('GameOverScene',{score:this.score,coins});
        }
      }
    }
    bomb.destroy();
  }

  updateHealthBar(b){
    if(!b.healthBar||!b.alive) return;
    b.healthBar.clear();
    let w=38,h=7;
    b.healthBar.fillStyle(0x008800,0.7).fillRect(b.x-w/2,b.y-36,w*(b.health/BUILDING_HEALTH),h);
    b.healthBar.lineStyle(1,0xffffff,1).strokeRect(b.x-w/2,b.y-36,w,h);
  }

  showRandomMeme(){
    const m = Phaser.Utils.Array.GetRandom(MEME_MESSAGES);
    const cx = this.cameras.main.centerX;
    const img = this.add.image(cx,60,m.img).setScale(0.7).setOrigin(0.5,0);
    const txt = this.add.text(cx, img.y+img.displayHeight+8, m.text, {
      font:"18px monospace", fill:"#fff", backgroundColor:"#1a1a1ac9",
      align:"center", padding:{left:8,right:8,top:2,bottom:2}, wordWrap:{width:260}
    }).setOrigin(0.5,0);
    this.time.delayedCall(2300, ()=>{ img.destroy(); txt.destroy(); });
  }

  spawnPowerUp(){
    const type = Phaser.Utils.Array.GetRandom(POWERUP_TYPES);
    const x = Phaser.Math.Between(60,this.cameras.main.width-60),
          y = Phaser.Math.Between(70,this.cameras.main.height-150),
          key = type==="extra_dove"?"dove":"coin_icon";
    let pu = this.physics.add.sprite(x,y,key).setScale(0.6).setInteractive();
    pu.on('pointerdown', ()=>{ this.activatePowerUp(type); pu.destroy(); });
    this.time.delayedCall(8000, ()=>pu.destroy());
  }

  activatePowerUp(type){
    if(type==="double_score"){
      this.doubleScoreActive = true;
      this.time.delayedCall(10000, ()=> this.doubleScoreActive=false);
    }
    if(type==="slow_rockets"){
      this.bombSpeedMultiplier *= 0.6;
      this.time.delayedCall(7000, ()=> this.adjustDifficulty());
    }
    if(type==="freeze"){
      this.bombTimer.paused = true;
      this.time.delayedCall(4000, ()=> this.bombTimer.paused=false);
    }
    if(type==="extra_dove"){
      for(let i=0;i<3;i++) this.spawnBomb();
    }
  }
}

// --- GameOverScene ---
class GameOverScene extends Phaser.Scene {
  constructor(){ super('GameOverScene'); }
  create(data){
    const { centerX, centerY } = this.cameras.main;
    this.cameras.main.setBackgroundColor("#222");
    this.add.text(centerX,200,"Game Over!",{font:'36px monospace',fill:'#fff'}).setOrigin(0.5);
    this.add.text(centerX,250,`Score: ${data.score}`,{font:'28px monospace',fill:'#ffd'}).setOrigin(0.5);
    this.add.text(centerX,290,`PMNOFO Coin: ${data.coins}`,{font:'24px monospace',fill:'#3f6'}).setOrigin(0.5);
    const retry = this.add.text(centerX,360,"Play Again",{font:'24px monospace',fill:'#1df',backgroundColor:'#133'})
      .setOrigin(0.5).setPadding(10).setInteractive();
    retry.on('pointerdown', ()=>this.scene.start('LobbyScene'));
  }
}

// --- HowToPlayScene ---
class HowToPlayScene extends Phaser.Scene {
  constructor(){ super('HowToPlayScene'); }
  create(){
    const vars = getScaleVars(this);
    this.add.rectangle(vars.w/2, vars.h/2, vars.w, vars.h, 0x000000, 0.96);
    this.add.text(vars.w/2, vars.h*0.1, "Amaç ve Kurallar",{ font:`${vars.fontBig}px monospace`, fill:'#fff' }).setOrigin(0.5);
    const msg =
      "🕊️ Welcome to Peace Missile! 🕊️\n\n" +
      "Turn missiles into doves and bring peace to the world.\n\n" +
      "Each conversion earns you points.\n\n" +
      "💰 Earn PMNOFO Coins equal to your score.\n\n" +
      "Break your own record for bonus coins!\n\n" +
      "📊 Use `/leaderboard` to see top players.\n\n" +
      "Start your mission now!";
    this.add.text(vars.w/2, vars.h*0.17, msg,
      { font:`${vars.fontSmall+3}px monospace`, fill:'#fff', align:'center' }
    ).setOrigin(0.5,0);
    this.add.text(vars.w/2, vars.h-80, "< Back",{ font:`${vars.fontMid}px monospace`, fill:'#67f' })
      .setOrigin(0.5).setInteractive().on('pointerup', ()=>this.scene.start('LobbyScene'));
  }
}

// --- LeaderboardScene ---
class LeaderboardScene extends Phaser.Scene {
  constructor(){ super('LeaderboardScene'); }
  async create(){
    const vars = getScaleVars(this);
    this.add.rectangle(vars.w/2, vars.h/2, vars.w, vars.h, 0x000000, 0.93);
    this.add.text(vars.w/2, vars.h*0.11, "Leaderboard",{ font:`${vars.fontBig}px monospace`, fill:'#ffe349' }).setOrigin(0.5,0);
    const leaders = await fetchLeaderboard();
    leaders.forEach((u,i) => {
      this.add.text(vars.w/2, vars.h*0.17 + i*(vars.fontSmall+16),
        `${i+1}. ${u.username} - ${u.total_score} pts`,
        { font:`${vars.fontSmall+4}px monospace`, fill:'#fff' }
      ).setOrigin(0.5,0);
    });
    this.add.text(vars.w/2, vars.h-80, "< Back",{ font:`${vars.fontMid}px monospace`, fill:'#67f' })
      .setOrigin(0.5).setInteractive().on('pointerup', ()=>this.scene.start('LobbyScene'));
  }
}

// --- Launch Phaser ---
const config = {
  type: Phaser.AUTO,
  parent: 'phaser-game',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: "#000",
  scene: [ BootScene, LobbyScene, SideSelectScene, GameScene, GameOverScene, HowToPlayScene, LeaderboardScene ],
  physics: { default: "arcade", arcade: { gravity: { y: 0 } } },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH }
};
new Phaser.Game(config);
