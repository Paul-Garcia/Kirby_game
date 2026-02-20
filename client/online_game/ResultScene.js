import { socket } from './socket.js'
import { 
  loadAllCharacterAssets, 
  createAllDashAnimations,
  createAllLoseAnimations,
  createAllWinAnimations,
  createCharacterSprite,
  setCharacterFrame,
  adjustFlippedSpritePosition,
  normalizeCharacter,
  getCharacterConfig
} from './characterUtils.js'

export class ResultScene extends Phaser.Scene {
    constructor() {
      super('ResultScene')
    }
  
    init(data) {
      this.result = data
    }

    preload() {
      console.log("reload page")
      this.load.image('background', './online_game/background.png')
      this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
      this.load.spritesheet('foreground', './online_game/foreground_grass.png', {
          frameWidth: 512, // Largeur d'une frame
          frameHeight: 112, // 448px / 4 frames = 112px
          endFrame: 3
      });
      this.load.image('tie', './online_game/tie.png')
      // Charge tous les assets des personnages de manière modulaire
      loadAllCharacterAssets(this)
      this.load.atlas('go', './online_game/go.png', './online_game/go.json');
  }
  

    create() {
      // Crée les animations de course pour tous les personnages de manière modulaire
      createAllDashAnimations(this)
      // Crée les animations de défaite pour les personnages qui en ont
      createAllLoseAnimations(this)
      // Crée les animations de victoire pour les personnages qui en ont
      createAllWinAnimations(this)

      this.anims.create({
          key: 'scroll',
          frames: this.anims.generateFrameNumbers('foreground', { start: 0, end: 3 }),
          frameRate: 10,
          repeat: -1
      });
      
      const { player1, player2, winnerSocket } = this.result
      console.log('[ResultScene] Résultat:', { winnerSocket, player1, player2 })
      
      // Récupère les skins réels depuis localStorage avec normalisation modulaire
      const myCharacter = normalizeCharacter(window.localStorage.getItem('kirby_selected_character'))
      const oppChar = normalizeCharacter(window.localStorage.getItem('kirby_opponent_character'))
      
      console.log('[ResultScene] Skins - Nous:', myCharacter, 'Adversaire:', oppChar)
      // IMPORTANT: Les deux joueurs peuvent avoir le même skin, c'est géré par le système modulaire
      
      // Détermine qui est player1 et player2 selon notre socket.id
      const iAmPlayer1 = player1?.socket === socket.id
      const p1Character = iAmPlayer1 ? myCharacter : oppChar
      const p2Character = iAmPlayer1 ? oppChar : myCharacter
      
      console.log('[ResultScene] P1 skin:', p1Character, 'P2 skin:', p2Character, '(Je suis P1:', iAmPlayer1, ')')
      
      this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
      this.spriteforeground = this.add.sprite(0, 444, 'foreground', 0).setOrigin(0, 1).setDepth(1);
      
      // Positions symétriques par rapport au centre de l'écran
      const centerX = 256 // 512 / 2
      const distanceFromCenter = 136 // Distance symétrique du centre
      const leftX = centerX - distanceFromCenter // 120 (gauche)
      const rightX = centerX + distanceFromCenter // 392 (droite)
      
      // Crée les sprites selon les vrais skins de manière modulaire
      // Player1 toujours à gauche, Player2 toujours à droite (positions symétriques)
      // IMPORTANT: Les deux joueurs peuvent avoir le même skin, c'est géré automatiquement
      this.p1Sprite = createCharacterSprite(this, p1Character, leftX, 320, false)
      this.p2Sprite = createCharacterSprite(this, p2Character, rightX, 320, true, rightX)
      
      console.log(`[ResultScene] P1Sprite (${p1Character}) créé à x:`, leftX)
      console.log(`[ResultScene] P2Sprite (${p2Character}) créé à x:`, this.p2Sprite.x, '(largeur:', this.p2Sprite.displayWidth, ')')

      if (winnerSocket != null) {
        // Détermine qui est le gagnant et qui est le perdant
        const winnerIsP1 = String(winnerSocket) === String(player1?.socket)
        const p1Won = winnerIsP1
        const p2Won = !winnerIsP1
        
        console.log('[ResultScene] === Détermination victoire/défaite ===')
        console.log('[ResultScene] P1 a gagné:', p1Won, 'P2 a gagné:', p2Won)
        
        // Change les frames selon la victoire/défaite de manière modulaire
        // Pour les animations de victoire/défaite, on attendra la fin du déplacement
        if (this.p1Sprite) {
          const config = getCharacterConfig(p1Character)
          if (p1Won) {
            // Pour la victoire, si pas d'animation, on définit la frame maintenant
            if (!config || !config.winFrames) {
              setCharacterFrame(this.p1Sprite, p1Character, 'win')
            } else {
              // On définit juste la frame idle pour l'instant, l'animation sera jouée après le déplacement
              this.p1Sprite.setFrame(config.frames.idle)
            }
          } else {
            // Pour la défaite, si pas d'animation, on définit la frame maintenant
            if (!config || !config.loseFrames) {
              setCharacterFrame(this.p1Sprite, p1Character, 'lose')
            } else {
              // On définit juste la frame idle pour l'instant, l'animation sera jouée après le déplacement
              this.p1Sprite.setFrame(config.frames.idle)
            }
          }
        }
        
        if (this.p2Sprite) {
          const config = getCharacterConfig(p2Character)
          if (p2Won) {
            // Pour la victoire, si pas d'animation, on définit la frame maintenant
            if (!config || !config.winFrames) {
              setCharacterFrame(this.p2Sprite, p2Character, 'win')
            } else {
              // On définit juste la frame idle pour l'instant, l'animation sera jouée après le déplacement
              this.p2Sprite.setFrame(config.frames.idle)
            }
          } else {
            // Pour la défaite, si pas d'animation, on définit la frame maintenant
            if (!config || !config.loseFrames) {
              setCharacterFrame(this.p2Sprite, p2Character, 'lose')
            } else {
              // On définit juste la frame idle pour l'instant, l'animation sera jouée après le déplacement
              this.p2Sprite.setFrame(config.frames.idle)
            }
          }
          // Réajuste la position X après changement de frame (la largeur peut changer)
          adjustFlippedSpritePosition(this.p2Sprite, rightX)
        }
        
        // Les deux sprites se déplacent symétriquement jusqu'à la position initiale de l'autre
        // P1 (gauche) va jusqu'à la position initiale de P2 (droite)
        // P2 (droite) va jusqu'à la position initiale de P1 (gauche)
        const p1TargetX = rightX // P1 va jusqu'à la position initiale de P2
        const p2TargetX = leftX // P2 va jusqu'à la position initiale de P1
        
        console.log('[ResultScene] === Déplacement symétrique des deux sprites ===')
        console.log('[ResultScene] P1 (gauche) part de:', leftX, '→ va vers:', p1TargetX)
        console.log('[ResultScene] P2 (droite) part de:', rightX, '→ va vers:', p2TargetX)
        
        // P1 (gauche) se déplace vers la droite jusqu'à la position initiale de P2
        if (this.p1Sprite) {
          this.tweens.add({
            targets: this.p1Sprite,
            x: p1TargetX,
            duration: 500,
            ease: 'Power2',
            onStart: () => {
              console.log('[ResultScene] ✅ Tween démarré pour P1 (gauche)')
            },
            onComplete: () => {
              console.log('[ResultScene] ✅ Tween P1 terminé, position finale:', this.p1Sprite.x)
              // Déclenche l'animation de victoire/défaite à la fin du déplacement
              setCharacterFrame(this.p1Sprite, p1Character, p1Won ? 'win' : 'lose')
            }
          });
        }
        
        // P2 (droite, flipé) se déplace vers la gauche jusqu'à la position initiale de P1
        // Ajuste la position cible pour tenir compte de la largeur du sprite flipé
        if (this.p2Sprite) {
          const p2TargetXAdjusted = p2TargetX - this.p2Sprite.displayWidth
          this.tweens.add({
            targets: this.p2Sprite,
            x: p2TargetXAdjusted,
            duration: 500,
            ease: 'Power2',
            onStart: () => {
              console.log('[ResultScene] ✅ Tween démarré pour P2 (droite)')
            },
            onComplete: () => {
              console.log('[ResultScene] ✅ Tween P2 terminé, position finale:', this.p2Sprite.x)
              // Déclenche l'animation de victoire/défaite à la fin du déplacement
              setCharacterFrame(this.p2Sprite, p2Character, p2Won ? 'win' : 'lose')
              // Réajuste la position X après changement de frame/animation (la largeur peut changer)
              // Utilise p2TargetX (position finale) au lieu de rightX (position initiale)
              adjustFlippedSpritePosition(this.p2Sprite, p2TargetX)
            }
          });
        }
      } else {
        // Égalité : les deux vont au centre puis disparaissent
        this.tweens.add({
          targets: this.p1Sprite,
          x: 256,
          duration: 100,
          ease: 'Power2',
          onComplete: () => { this.p1Sprite.setVisible(false); }
        });
        // Ajuste la position cible pour tenir compte de la largeur du sprite flipé
        const p2CenterXAdjusted = 256 - this.p2Sprite.displayWidth
        this.tweens.add({
          targets: this.p2Sprite,
          x: p2CenterXAdjusted,
          duration: 100,
          ease: 'Power2',
          onComplete: () => { 
            this.p2Sprite.setVisible(false)
            this.add.image(256, 320, 'tie').setOrigin(0.5, 1).setDepth(2)
          }
        });
      }
      this.spriteforeground.play('scroll');      
  
      const isWin = winnerSocket === socket.id
      const isTie = winnerSocket === null

      const p1Label = player1?.name ? `${player1.name}` : 'Player1'
      const p2Label = player2?.name ? `${player2.name}` : 'Player2'
      
      const p1Time = player1.time || 'N/A'
      const p2Time = player2.time || 'N/A'
      
      // Fond semi-transparent pour améliorer la lisibilité
      const bgRect = this.add.rectangle(256, 222, 480, 200, 0x000000, 0.7)
        .setOrigin(0.5)
        .setDepth(10)
      
      // Titre du résultat (plus grand et coloré)
      let resultText, resultColor
      if (isTie) {
        resultText = '🟰 ÉGALITÉ'
        resultColor = '#FFD700' // Or
      } else if (isWin) {
        resultText = '✅ VICTOIRE !'
        resultColor = '#00FF00' // Vert
      } else {
        resultText = '❌ DÉFAITE'
        resultColor = '#FF4444' // Rouge
      }
      
      const titleText = this.add.text(256, 140, resultText, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '20px',
        color: resultColor,
        align: 'center',
        fontStyle: 'bold'
      }).setOrigin(0.5).setResolution(2).setDepth(11)
      
      // Scores des joueurs (plus lisible)
      const scoresY = 180
      const scoresText = this.add.text(256, scoresY, `${p1Label}: ${p1Time}ms\n${p2Label}: ${p2Time}ms`, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '14px',
        color: '#FFFFFF',
        align: 'center',
        lineSpacing: 8
      }).setOrigin(0.5).setResolution(2).setDepth(11)
      
      // Instruction en bas
      const instructionText = this.add.text(256, 280, 'Clique pour continuer', {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '10px',
        color: '#CCCCCC',
        align: 'center'
      }).setOrigin(0.5).setResolution(2).setDepth(11)
  
      this.input.once('pointerdown', () => {
        socket.emit('back_on_queue')
        this.scene.start('MenuScene')
      })
    }
  }
  