// game.js (düzenlenmiş)

// Önceki sahneleri kaldırmadan önce yeni sahneleri ekliyoruz
class SideSelectionScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SideSelectionScene' });
    }

    create() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;

        this.add.text(gameWidth / 2, gameHeight * 0.1, 'Choose Your Side', {
            fontSize: `${Math.max(32, gameWidth * 0.05)}px`,
            fill: '#fff',
            stroke: '#000',
            strokeThickness: 6
        }).setOrigin(0.5);

        const israelBtn = this.add.text(gameWidth / 2, gameHeight * 0.4, '🇮🇱 ISRAEL', {
            fontSize: `${Math.max(28, gameWidth * 0.04)}px`,
            fill: '#ffffff',
            backgroundColor: '#1f1f1f',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const iranBtn = this.add.text(gameWidth / 2, gameHeight * 0.6, '🇮🇷 IRAN', {
            fontSize: `${Math.max(28, gameWidth * 0.04)}px`,
            fill: '#ffffff',
            backgroundColor: '#1f1f1f',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        israelBtn.on('pointerdown', () => this.startLobby('israel'));
        iranBtn.on('pointerdown', () => this.startLobby('iran'));
    }

    startLobby(side) {
        this.scene.start('LobbyScene', { side });
    }
}

// LobbyScene sahnesini güncelliyoruz
class LobbyScene extends Phaser.Scene {
    constructor() {
        super({ key: 'LobbyScene' });
    }

    init() {
        // Side seçimini URL’den al
        const urlParams = new URLSearchParams(window.location.search);
        this.selectedSide = urlParams.get('side') || 'israel'; // default israel
    }

    preload() {}

    create() {
        const gameWidth = this.cameras.main.width;
        const gameHeight = this.cameras.main.height;

        // Takım arka planı
        const bgKey = this.selectedSide === 'iran' ? 'iran_bg' : 'israel_bg';
        this.add.image(gameWidth / 2, gameHeight / 2, bgKey).setDisplaySize(gameWidth, gameHeight);

        // Hoş geldin metni
        const welcomeFontSize = Math.max(26, Math.floor(gameWidth * 0.045));
        this.add.text(gameWidth / 2, gameHeight * 0.11, 
            `Welcome, ${currentUser ? currentUser.first_name : 'Ambassador'}!`, 
            { fontSize: `${welcomeFontSize}px`, fill: '#fff', stroke: '#000', strokeThickness: 6, fontStyle: "bold" }
        ).setOrigin(0.5);

        // Skor kutuları
        const infoY = gameHeight * 0.2;
        const boxW = Math.floor(gameWidth * 0.8);
        const boxH = Math.floor(gameHeight * 0.22);

        // Ana kutu
        const statBox = this.add.graphics();
        statBox.fillStyle(0x000000, 0.6);
        statBox.fillRoundedRect((gameWidth - boxW) / 2, infoY, boxW, boxH, 32);

        // Max Score, Total Score, Coin
        const iconSize = Math.floor(boxH * 0.32);
        const textSize = Math.floor(boxH * 0.19);

        // İkonlar
        this.add.image(gameWidth * 0.25, infoY + boxH * 0.33, 'score_icon').setDisplaySize(iconSize, iconSize);
        this.add.image(gameWidth * 0.25, infoY + boxH * 0.68, 'coin_icon').setDisplaySize(iconSize, iconSize);
        
        // Metinler (dinamik, önce Loading)
        this.maxScoreText = this.add.text(gameWidth * 0.35, infoY + boxH * 0.33, 'Max Score: Loading...', 
            { fontSize: `${textSize}px`, fill: '#fff' }).setOrigin(0, 0.5);
        this.totalScoreText = this.add.text(gameWidth * 0.35, infoY + boxH * 0.52, 'Total Score: Loading...', 
            { fontSize: `${textSize}px`, fill: '#fff' }).setOrigin(0, 0.5);
        this.coinText = this.add.text(gameWidth * 0.35, infoY + boxH * 0.68, 'Coins: Loading...', 
            { fontSize: `${textSize}px`, fill: '#fff' }).setOrigin(0, 0.5);

        // Firebase’den verileri çek
        if (currentUser && db) {
            const userDocRef = db.collection('users').doc(String(currentUser.id));
            userDocRef.get().then(doc => {
                if (doc.exists) {
                    const data = doc.data();
                    this.maxScoreText.setText(`Max Score: ${data.score || 0}`);
                    this.totalScoreText.setText(`Total Score: ${data.total_score || 0}`);
                    this.coinText.setText(`Coins: ${data.total_pmno_coins || 0}`);
                } else {
                    this.maxScoreText.setText(`Max Score: 0`);
                    this.totalScoreText.setText(`Total Score: 0`);
                    this.coinText.setText(`Coins: 0`);
                }
            }).catch(err => {
                this.maxScoreText.setText('Max Score: -');
                this.totalScoreText.setText('Total Score: -');
                this.coinText.setText('Coins: -');
            });
        } else {
            this.maxScoreText.setText('Max Score: N/A');
            this.totalScoreText.setText('Total Score: N/A');
            this.coinText.setText('Coins: N/A');
        }

        // Start Game butonu
        const btnW = gameWidth * 0.65;
        const btnH = Math.max(60, gameHeight * 0.08);
        const startY = infoY + boxH + gameHeight * 0.08;
        const startBtn = this.add.rectangle(gameWidth / 2, startY, btnW, btnH, 0x1976d2, 1)
            .setStrokeStyle(4, 0xffffff)
            .setInteractive({ useHandCursor: true });

        this.add.text(gameWidth / 2, startY, "START GAME", {
            fontSize: `${Math.floor(btnH * 0.48)}px`,
            fill: "#fff",
            fontStyle: "bold"
        }).setOrigin(0.5);

        startBtn.on('pointerdown', () => {
            this.scene.start('GameScene'); // Oyun sahnesine geç
        });

        // Menü butonları (Leaderboard ve Info)
        const menuBtnW = btnW * 0.44;
        const menuBtnH = btnH * 0.82;
        const menuY = startY + btnH * 1.25;
        // Leaderboard
        const leaderboardBtn = this.add.rectangle(
            gameWidth / 2 - menuBtnW * 0.56, menuY, menuBtnW, menuBtnH, 0x333333, 1
        ).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        this.add.text(
            gameWidth / 2 - menuBtnW * 0.56, menuY, "Leaderboard", { fontSize: `${Math.floor(menuBtnH * 0.48)}px`, fill: "#fff" }
        ).setOrigin(0.5);

        // Game Info
        const infoBtn = this.add.rectangle(
            gameWidth / 2 + menuBtnW * 0.56, menuY, menuBtnW, menuBtnH, 0x333333, 1
        ).setStrokeStyle(2, 0xffffff).setInteractive({ useHandCursor: true });
        this.add.text(
            gameWidth / 2 + menuBtnW * 0.56, menuY, "Game Info", { fontSize: `${Math.floor(menuBtnH * 0.48)}px`, fill: "#fff" }
        ).setOrigin(0.5);

        // Buton işlevleri (modal gösterim)
        leaderboardBtn.on('pointerdown', () => this.showLeaderboardModal());
        infoBtn.on('pointerdown', () => this.showGameInfoModal());
    }

    // Modal fonksiyonları
    showLeaderboardModal() {
        // Modal: Dış kısmı ve kutu
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const modalBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.85).setDepth(20);
        const modalBox = this.add.rectangle(w / 2, h / 2, w * 0.8, h * 0.6, 0x222222, 1).setStrokeStyle(4, 0xffffff).setDepth(21);

        const loadingText = this.add.text(w / 2, h / 2, "Loading Leaderboard...", { fontSize: "28px", fill: "#fff" })
            .setOrigin(0.5).setDepth(22);

        // Firebase’den leaderboard çek
        if (db) {
            db.collection('users')
                .orderBy('total_score', 'desc').limit(10).get()
                .then(snapshot => {
                    loadingText.setText(""); // Temizle
                    let y = h / 2 - (h * 0.23);
                    snapshot.forEach((doc, i) => {
                        const d = doc.data();
                        this.add.text(w / 2 - 80, y, `${i + 1}.`, { fontSize: "23px", fill: "#FFD700" }).setOrigin(1, 0.5).setDepth(22);
                        this.add.text(w / 2 - 70, y, d.username || d.first_name || "-", { fontSize: "23px", fill: "#fff" }).setOrigin(0, 0.5).setDepth(22);
                        this.add.text(w / 2 + 80, y, `${d.total_score || 0} ☮️`, { fontSize: "23px", fill: "#fff" }).setOrigin(1, 0.5).setDepth(22);
                        y += 35;
                    });
                    if (snapshot.empty) {
                        loadingText.setText("No players yet!").setDepth(22);
                    }
                });
        }

        // Kapatma butonu
        const closeBtn = this.add.text(w / 2, h / 2 + (h * 0.29), "Close", { fontSize: "30px", fill: "#fff", backgroundColor: "#d32f2f" })
            .setOrigin(0.5).setDepth(22).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            modalBg.destroy();
            modalBox.destroy();
            loadingText.destroy();
            closeBtn.destroy();
            // Tüm leaderboard satırlarını sil (en temiz yol: sahneyi yeniden başlatmak)
            this.scene.restart();
        });
    }

    showGameInfoModal() {
        const w = this.cameras.main.width;
        const h = this.cameras.main.height;
        const modalBg = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.85).setDepth(20);
        const modalBox = this.add.rectangle(w / 2, h / 2, w * 0.8, h * 0.6, 0x222222, 1).setStrokeStyle(4, 0xffffff).setDepth(21);
        const infoText = this.add.text(
            w / 2, h / 2 - 90, 
            "Game Objective:\nTurn rockets into doves!\n\nEvery rocket stopped is 10 points.\nFinish with new highscore = BIG coin bonus!\nCheck the leaderboard and your coins!\n\nGame made for peace, not war.",
            { fontSize: "24px", fill: "#fff", align: "center", wordWrap: { width: w * 0.75 } }
        ).setOrigin(0.5).setDepth(22);

        const closeBtn = this.add.text(w / 2, h / 2 + (h * 0.21), "Close", { fontSize: "30px", fill: "#fff", backgroundColor: "#d32f2f" })
            .setOrigin(0.5).setDepth(22).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            modalBg.destroy();
            modalBox.destroy();
            infoText.destroy();
            closeBtn.destroy();
        });
    }
}


// GameScene zaten var, içine "init(data)" eklenmeli:
// init(data) {
//   this.selectedSide = data.side;
// }

// config sahnesine yeni sahne ekle:
const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    physics: { default: 'arcade', arcade: { gravity: { y: 0 } } },
    scene: [SideSelectionScene, Preloader, LobbyScene, GameScene],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};