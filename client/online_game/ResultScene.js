import { socket } from './socket.js'

export class ResultScene extends Phaser.Scene {
    constructor() {
      super('ResultScene')
    }
  
    init(data) {
      this.result = data
    }

    preload() {
      this.load.image('background', './online_game/background.png')
      this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
      this.load.spritesheet('foreground', './online_game/foreground_grass.png', {
          frameWidth: 512, // Largeur d'une frame
          frameHeight: 112, // 448px / 4 frames = 112px
          endFrame: 3
      });
      this.load.image('tie', './online_game/tie.png')
      this.load.atlas('waddle', './online_game/waddle.png', './online_game/waddle.json');
      this.load.atlas('kirb', './online_game/kirb.png', './online_game/kirb.json');
      this.load.atlas('go', './online_game/go.png', './online_game/go.json');

      if (!this.anims.exists('waddle_dash')) {
        this.anims.create({
            key: 'waddle_dash',
            frames: [
                { key: 'waddle', frame: 'waddle1' },
                { key: 'waddle', frame: 'waddle2' },
                { key: 'waddle', frame: 'waddle3' },
                { key: 'waddle', frame: 'waddle4' }
            ],
            frameRate: 10,
            repeat: -1
        });
      }

      if (!this.anims.exists('kirb_dash')) {
        this.anims.create({
            key: 'kirb_dash',
            frames: [
                { key: 'kirb', frame: 'kirb1' },
                { key: 'kirb', frame: 'kirb1' },
                { key: 'kirb', frame: 'kirb1' },
                { key: 'kirb', frame: 'kirb1' }
            ],
            frameRate: 10,
            repeat: -1
        });
      }

      if (!this.anims.exists('go_change')) {
        this.anims.create({
            key: 'go_change',
            frames: [
                { key: 'go', frame: 'go1' },
                { key: 'go', frame: 'go2' },
                { key: 'go', frame: 'go3' },
            ],
            frameRate: 10,
            repeat: -1
        });
      }
      
      if (!this.anims.exists('scroll')) {
        this.anims.create({
            key: 'scroll',
            frames: this.anims.generateFrameNumbers('foreground', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
      }
  }
  
  
    create() {

      const { player1, player2, winnerSocket } = this.result
      this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
      this.spriteforeground = this.add.sprite(0, 440, 'foreground', 0).setOrigin(0, 1).setDepth(1);
      this.waddle = this.add.sprite(320, 320, 'waddle', 'waddle1').setOrigin(0, 1).setDepth(2);
      this.kirb = this.add.sprite(120, 320, 'kirb', 'kirb1').setOrigin(0, 1).setDepth(2);

      if (winnerSocket != null) {
        this.tweens.add({
          targets: this.waddle,
          x: 120,
          duration: 500,
          ease: 'Power2'
        });
        this.tweens.add({
          targets: this.kirb,
          x: 320,
          duration: 500,
          ease: 'Power2'
        });
      } else {
        this.tweens.add({
          targets: this.waddle,
          x: 256,
          duration: 100,
          ease: 'Power2',
          onComplete: () => { this.waddle.setVisible(false);}
        });
        this.tweens.add({
          targets: this.kirb,
          x: 200,
          duration: 100,
          ease: 'Power2',
          onComplete: () => { this.kirb.setVisible(false); this.add.image(256, 320, 'tie').setOrigin(0.5, 1).setDepth(2);}
        });
      }

      if(winnerSocket != null && winnerSocket == player1.socket) {
        this.kirb.setFrame('kirb2');
        this.waddle.setFrame('waddle4');
      } else if (winnerSocket != null && winnerSocket == player2.socket) {
        this.kirb.setFrame('kirb4');
        this.waddle.setFrame('waddle2');
      }
      this.spriteforeground.play('scroll');      
  
      const UI_FONT = '"Press Start 2P", monospace'
      const UI_RES = 2

      const meId = socket.id
      const isTie = winnerSocket === null || winnerSocket === undefined
      const isWin = !isTie && winnerSocket === meId
      const title = isTie ? 'EGALITE' : (isWin ? 'VICTOIRE' : 'DEFAITE')
      const titleColor = isTie ? '#ffd54a' : (isWin ? '#66ff8a' : '#ff6a6a')

      const p1Name = player1?.name || 'Player1'
      const p2Name = player2?.name || 'Player2'

      const p1Time = Number(player1?.time)
      const p2Time = Number(player2?.time)
      const p1TimeOk = Number.isFinite(p1Time)
      const p2TimeOk = Number.isFinite(p2Time)
      const p1TimeStr = p1TimeOk ? `${p1Time.toFixed(1)} ms` : '—'
      const p2TimeStr = p2TimeOk ? `${p2Time.toFixed(1)} ms` : '—'

      const winnerIsP1 = !isTie && winnerSocket === player1?.socket
      const winnerIsP2 = !isTie && winnerSocket === player2?.socket

      const leftLabel = player1?.socket === meId ? 'TOI' : 'ADVERSAIRE'
      const rightLabel = player2?.socket === meId ? 'TOI' : 'ADVERSAIRE'

      // Panneau lisible
      const panelX = 36
      const panelY = 22
      const panelW = 512 - panelX * 2
      const panelH = 170
      const panel = this.add.graphics().setDepth(10)
      panel.fillStyle(0x000000, 0.55)
      panel.lineStyle(2, 0xffffff, 0.22)
      panel.fillRoundedRect(panelX, panelY, panelW, panelH, 14)
      panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 14)

      const titleText = this.add.text(256, panelY + 18, title, {
        fontFamily: UI_FONT,
        fontSize: '24px',
        color: titleColor,
        align: 'center'
      }).setOrigin(0.5, 0).setDepth(11).setResolution(UI_RES)

      // Petite ligne d'explication
      const subtitle = isTie ? 'Personne ne gagne' : (isWin ? 'Tu as ete le plus rapide' : 'Ton adversaire a ete plus rapide')
      this.add.text(256, panelY + 56, subtitle, {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: panelW - 32, useAdvancedWrap: true }
      }).setOrigin(0.5, 0).setDepth(11).setResolution(UI_RES)

      // Tableau (2 lignes)
      const rowY1 = panelY + 92
      const rowY2 = panelY + 122
      const colLeftX = panelX + 18
      const colRightX = panelX + panelW - 18

      const rowStyle = {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#ffffff'
      }

      const p1Prefix = winnerIsP1 ? '★ ' : '  '
      const p2Prefix = winnerIsP2 ? '★ ' : '  '

      this.add.text(colLeftX, rowY1, `${p1Prefix}${leftLabel}: ${p1Name}`, rowStyle)
        .setOrigin(0, 0).setDepth(11).setResolution(UI_RES)
      this.add.text(colRightX, rowY1, p1TimeStr, {
        ...rowStyle,
        color: winnerIsP1 ? '#66ff8a' : '#ffffff'
      }).setOrigin(1, 0).setDepth(11).setResolution(UI_RES)

      this.add.text(colLeftX, rowY2, `${p2Prefix}${rightLabel}: ${p2Name}`, rowStyle)
        .setOrigin(0, 0).setDepth(11).setResolution(UI_RES)
      this.add.text(colRightX, rowY2, p2TimeStr, {
        ...rowStyle,
        color: winnerIsP2 ? '#66ff8a' : '#ffffff'
      }).setOrigin(1, 0).setDepth(11).setResolution(UI_RES)

      // Hint "rejouer"
      this.add.text(256, panelY + panelH - 18, 'Clique pour rejouer', {
        fontFamily: UI_FONT,
        fontSize: '12px',
        color: '#d7e6ff',
        align: 'center'
      }).setOrigin(0.5, 0.5).setDepth(11).setResolution(UI_RES)
  
      this.input.once('pointerdown', () => {
        socket.emit('back_on_queue')
        this.scene.start('MenuScene')
      })
    }
  }
  