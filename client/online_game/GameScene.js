import { socket } from './socket.js'
import { 
  loadAllCharacterAssets, 
  createCharacterSprite, 
  normalizeCharacter
} from './characterUtils.js'

export class GameScene extends Phaser.Scene {
    constructor() {
      super('GameScene')
    }
    preload() {
        this.load.image('background', './online_game/background.png')
        this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
        this.load.spritesheet('foreground', './online_game/foreground_grass.png', {
            frameWidth: 512,
            frameHeight: 112,
            endFrame: 3
        });

        // Charge tous les assets des personnages de manière modulaire
        loadAllCharacterAssets(this)
        
        this.load.atlas('go', './online_game/go.png', './online_game/go.json');
    }    
    
    create() {
        socket.removeAllListeners('result')
        socket.removeAllListeners('go')
        const UI_FONT = '"Press Start 2P", monospace'
        const UI_TEXT_RES = 2

        // Crée l'animation de l'herbe (scroll)
        this.anims.create({
            key: 'scroll',
            frames: this.anims.generateFrameNumbers('foreground', { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1
        });
        
        this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
        this.spriteforeground = this.add.sprite(0, 444, 'foreground', 0).setOrigin(0, 1).setDepth(1);
        
        // Récupère les skins avec normalisation modulaire
        const myCharacterRaw = window.localStorage.getItem('kirby_selected_character')
        const opponentCharacterRaw = window.localStorage.getItem('kirby_opponent_character')
        
        const myCharacter = normalizeCharacter(myCharacterRaw)
        const opponentCharacter = normalizeCharacter(opponentCharacterRaw)
        
        console.log('[GameScene] === Création des sprites ===')
        console.log('[GameScene] Notre skin:', myCharacter, '(depuis localStorage:', myCharacterRaw, ')')
        console.log('[GameScene] Skin adversaire:', opponentCharacter, '(depuis localStorage:', opponentCharacterRaw, ')')
        // IMPORTANT: Les deux joueurs peuvent avoir le même skin, c'est géré par le système modulaire
        
        // Stocke les skins pour les utiliser dans le handler 'go'
        this.myCharacter = myCharacter
        this.opponentCharacter = opponentCharacter
        
        // Positions symétriques par rapport au centre de l'écran
        const centerX = 256 // 512 / 2
        const distanceFromCenter = 136 // Distance symétrique du centre
        const leftX = centerX - distanceFromCenter // 120 (gauche)
        const rightX = centerX + distanceFromCenter // 392 (droite)
        
        // NOTRE personnage toujours à gauche (selon notre skin choisi) - EN IDLE (pas d'animation)
        // Position symétrique par rapport au centre
        this.mySprite = createCharacterSprite(this, myCharacter, leftX, 320, false)
        console.log(`[GameScene] ✅ Sprite ${myCharacter} créé à gauche (idle) - x:`, leftX)
        
        // ADVERSAIRE toujours à droite (flip horizontal) - selon son skin réel envoyé par le serveur - EN IDLE (pas d'animation)
        // Position symétrique par rapport au centre (même distance mais de l'autre côté)
        // IMPORTANT: Les deux joueurs peuvent avoir le même skin, c'est géré automatiquement
        this.opponentSprite = createCharacterSprite(this, opponentCharacter, rightX, 320, true, rightX)
        console.log(`[GameScene] ✅ Sprite ${opponentCharacter} adversaire créé à droite (flipé, idle) - x:`, this.opponentSprite.x, '(largeur:', this.opponentSprite.displayWidth, ')')
        
        console.log('[GameScene] ================================')
        
        this.spriteforeground.play('scroll');

        this.time.delayedCall(1000, () => {
            this.goSprite = this.add.sprite(256, 222, 'go', 'go1').setOrigin(0.5, 0.5).setDepth(3);
    
            // Phase 2 : Remplacer par 'go2' après 1s
            this.time.delayedCall(1000, () => {
                this.goSprite.setFrame('go2');
                this.time.delayedCall(1000, () => {
                    this.goSprite.setVisible(false); 
                });
            });
        });



        const text = this.add.text(256, 50, "Click the quickest\nwhen you see !!!" || '', {
            fontFamily: UI_FONT,
            fontSize: '20px',
            color: '#fff',
            align: 'center'
        }).setOrigin(0.5).setResolution(UI_TEXT_RES)

        // Pseudos au-dessus des personnages
        const myName = window.localStorage.getItem('kirby_my_name') || 'Moi'
        const opponentName = window.localStorage.getItem('kirby_opponent_name') || 'Adversaire'
        
        // Nom de notre personnage (toujours à gauche)
        this.myNameText = this.add.text(0, 0, myName, {
            fontFamily: UI_FONT,
          fontSize: '14px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.25)',
            padding: { left: 6, right: 6, top: 4, bottom: 4 }
        }).setOrigin(0.5, 1).setDepth(5).setResolution(UI_TEXT_RES)

        // Nom de l'adversaire (toujours à droite)
        this.opponentNameText = this.add.text(0, 0, opponentName, {
            fontFamily: UI_FONT,
          fontSize: '14px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.25)',
            padding: { left: 6, right: 6, top: 4, bottom: 4 }
        }).setOrigin(0.5, 1).setDepth(5).setResolution(UI_TEXT_RES)

        this.updateNamePositions()

        socket.on('go', (msg) => {
            console.log('[GameScene] === GO reçu ===')
            this.goSprite.setFrame('go3');
            this.goSprite.setVisible(true);
        })

        this.input.on('pointerdown', () => {
            // Le clic envoie juste le signal 'finish' au serveur
            // Les animations démarreront seulement quand on reçoit 'result'
            console.log('[GameScene] === Clic détecté - envoi finish ===')
            socket.emit('finish')
        })

        socket.on('status', (msg) => {
            this.scene.start('MenuScene')
        })
  
        socket.once('result', (data) => {
            // Utilise 'once' au lieu de 'on' pour ne recevoir le résultat qu'une seule fois
            console.log('[GameScene] === RESULT reçu ===')
            
            // Change directement de scène sans animations
            this.scene.start('ResultScene', data)
        })
    }

    update() {
        this.updateNamePositions()
        
        // Animations désactivées pour l'instant - pas de déplacement
    }

    updateNamePositions() {
        // Notre personnage toujours à gauche, adversaire toujours à droite
        if (this.mySprite && this.myNameText) {
          const topY = this.mySprite.y - (this.mySprite.displayHeight || this.mySprite.height || 0)
          this.myNameText.setPosition(this.mySprite.x + (this.mySprite.displayWidth || this.mySprite.width || 0) / 2, topY - 6)
        }
        if (this.opponentSprite && this.opponentNameText) {
          const topY = this.opponentSprite.y - (this.opponentSprite.displayHeight || this.opponentSprite.height || 0)
          this.opponentNameText.setPosition(this.opponentSprite.x + (this.opponentSprite.displayWidth || this.opponentSprite.width || 0) / 2, topY - 6)
        }
    }
}