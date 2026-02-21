import { socket, refreshHud, setStatusMessage } from './socket.js'
import { 
  loadAllCharacterAssets, 
  initializeBanners, 
  setupBanner, 
  normalizeCharacter, 
  getCharacterConfig,
  getAvailableCharacters
} from './characterUtils.js'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene')
  }

  preload() {
    this.player1 = false
    this.player2 = false
    this.load.image('background', './online_game/background.png')
    this.load.image('empty_banner', './online_game/empty_banner.png')
    
    // Charge tous les assets des personnages de manière modulaire
    loadAllCharacterAssets(this)
    
    this.load.spritesheet('foreground', './online_game/foreground_grass.png', {
      frameWidth: 512, // Largeur d'une frame
      frameHeight: 112, // 448px / 4 frames = 112px
      endFrame: 3
    });
    this.currentPhase = 'main_menu'
  }
  
  create() {
    socket.removeAllListeners('opponent_found')
    socket.removeAllListeners('game_start')
    socket.removeAllListeners('status')
    socket.removeAllListeners('status_ready')
    socket.removeAllListeners('queue_error')

    this.bg = this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0)

    // Animation herbe (comme dans GameScene / ResultScene)
    if (!this.anims.exists('scroll')) {
      this.anims.create({
        key: 'scroll',
        frames: this.anims.generateFrameNumbers('foreground', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
      })
    }
    this.spriteforeground = this.add.sprite(0, 444, 'foreground', 0).setOrigin(0, 1).setDepth(0.5)
    this.spriteforeground.play('scroll')

    // Barres noires (à cacher dans le menu, à afficher seulement quand un adversaire est trouvé)
    this.topBars = this.add.image(0, 0, 'empty_banner').setOrigin(0, 0).setDepth(1)
    this.bottomBars = this.add.image(0, 444, 'empty_banner').setOrigin(0, 1).setDepth(1)
    
    // Initialise toutes les bannières de manière modulaire
    const banners = initializeBanners(this)
    this.characterBanners = banners.my
    this.opponentBanners = banners.opponent

    this.playerName = window.localStorage.getItem('kirby_player_name') || ''
    // Récupère le personnage choisi (normalisé avec le système modulaire)
    const storedCharacter = window.localStorage.getItem('kirby_selected_character')
    this.selectedCharacter = normalizeCharacter(storedCharacter)
    const UI_FONT = '"Press Start 2P", monospace'
    const UI_TEXT_RES = 2

    this.titleText = this.add.text(256, 55, 'Kirby Online', {
      fontFamily: UI_FONT,
      fontSize: '32px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setResolution(UI_TEXT_RES)

    this.nameText = this.add.text(256, 95, this.getNameLabel(), {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: '#fff'
    }).setOrigin(0.5).setResolution(UI_TEXT_RES)
    // Le pseudo est déjà affiché dans le HUD (haut gauche) : on masque le texte central
    this.nameText.setVisible(false)

    // Status (Searching, Opponent disconnected, etc.) is in #hud-status (DOM, below title)

    // Pseudos au-dessus des bannières (affichés uniquement quand un adversaire est trouvé)
    // Notre nom en haut, adversaire en bas
    this.myNameText = this.add.text(512 - 10, 10, '', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.25)',
      padding: { left: 6, right: 6, top: 4, bottom: 4 }
    }).setOrigin(1, 0).setDepth(3).setVisible(false).setResolution(UI_TEXT_RES)

    this.opponentNameText = this.add.text(10, 444 - 10, '', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.25)',
      padding: { left: 6, right: 6, top: 4, bottom: 4 }
    }).setOrigin(0, 1).setDepth(3).setVisible(false).setResolution(UI_TEXT_RES)

    this.playBtn = this.makeButton(256, 190, 'Play', () => this.onPlay())
    this.nameBtn = this.makeButton(256, 240, 'Change nickname', () => this.openNameInput())
    this.characterBtn = this.makeButton(256, 290, this.getCharacterButtonLabel(), () => this.toggleCharacter())
    this.cancelBtn = this.makeButton(256, 230, 'Cancel', () => this.onCancel())
    this.cancelBtn.setVisible(false)
    
    // Affiche la bannière du personnage choisi en haut du menu
    this.showMainMenuBanner()

    this.input.on('pointerdown', () => {
      if (this.currentPhase === 'found') {
        socket.emit('ready')
      }
    })

    socket.on('queue_error', ({ message } = {}) => {
      setStatusMessage(message || 'Nickname error')
      this.setPhase('main_menu')
    })

    socket.on('opponent_found', ({ opponentName, opponentCharacter, youAre } = {}) => {
      console.log('=== RECEPTION opponent_found ===')
      console.log('Données brutes reçues:', { opponentName, opponentCharacter, youAre })
      console.log('Type de opponentCharacter:', typeof opponentCharacter, 'Valeur:', opponentCharacter)
      console.log('opponentCharacter est défini?', opponentCharacter !== undefined)
      console.log('opponentCharacter est null?', opponentCharacter === null)
      console.log('opponentCharacter est vide?', opponentCharacter === '')
      
      setStatusMessage(`Click to get ready\nOpponent: ${opponentName || '???'}`)
      
      // Stocke qui nous sommes et le skin de l'adversaire
      window.localStorage.setItem('kirby_you_are', youAre || '')
      const myCharacter = normalizeCharacter(this.selectedCharacter)
      
      // Normalise le skin de l'adversaire de manière modulaire
      let oppCharacter = normalizeCharacter(opponentCharacter)
      
      console.log('Skins finaux - Nous:', myCharacter, 'Adversaire:', oppCharacter)
      // IMPORTANT: Les deux joueurs peuvent avoir le même skin, c'est géré par le système modulaire
      console.log('Stockage dans localStorage: kirby_opponent_character =', oppCharacter)
      window.localStorage.setItem('kirby_opponent_character', oppCharacter)
      console.log('================================')
      
      // Place les pseudos : notre nom en haut, adversaire en bas
      const me = this.playerName || 'Me'
      const opp = opponentName || '???'
      this.myNameText.setText(me)
      this.opponentNameText.setText(opp)
      
      // Stocke pour GameScene
      window.localStorage.setItem('kirby_my_name', me)
      window.localStorage.setItem('kirby_opponent_name', opp)
      window.localStorage.setItem('kirby_my_character', myCharacter)
      
      // Affiche les bannières
      this.setPhase('found')
    })

    socket.on('status', (msg) => {
      if (msg === 'waiting') {
        setStatusMessage('Searching for an opponent...')
        this.setPhase('matchmaking')
      } else if (msg === 'idle' || msg === 'connected') {
        setStatusMessage('')
        this.setPhase('main_menu')
      } else {
        setStatusMessage(String(msg || ''))
        this.setPhase('main_menu')
      }
    })

    socket.on('status_ready', (data) => {
      this.players_data = data
      this.player1 = !!data?.player1?.ready
      this.player2 = !!data?.player2?.ready

      // Mise à jour "source of truth" avec les noms remontés par le serveur
      const youAre = window.localStorage.getItem('kirby_you_are') || ''
      
      if (youAre === 'player1') {
        // Nous = player1, adversaire = player2
        const myName = data?.player1?.name || this.playerName || 'Me'
        const oppName = data?.player2?.name || 'Opponent'
        this.myNameText.setText(myName)
        this.opponentNameText.setText(oppName)
        window.localStorage.setItem('kirby_my_name', myName)
        window.localStorage.setItem('kirby_opponent_name', oppName)
      } else if (youAre === 'player2') {
        // Nous = player2, adversaire = player1
        const myName = data?.player2?.name || this.playerName || 'Me'
        const oppName = data?.player1?.name || 'Opponent'
        this.myNameText.setText(myName)
        this.opponentNameText.setText(oppName)
        window.localStorage.setItem('kirby_my_name', myName)
        window.localStorage.setItem('kirby_opponent_name', oppName)
      }
    })

    socket.on('game_start', (msg) => {
      this.scene.start('GameScene', { msg })
    })

    // Affiche le menu au démarrage
    this.setPhase('main_menu')
  }

  update() {
    if (this.currentPhase === 'found') {
      socket.emit('ready_confirmed')
   
      const youAre = window.localStorage.getItem('kirby_you_are') || ''
      const myCharacter = normalizeCharacter(this.selectedCharacter)
      const opponentCharacter = normalizeCharacter(
        window.localStorage.getItem('kirby_opponent_character'),
        myCharacter
      )
      
      // Notre état ready
      const myReady = (youAre === 'player1' && this.player1) || (youAre === 'player2' && this.player2)
      // État ready de l'adversaire
      const opponentReady = (youAre === 'player1' && this.player2) || (youAre === 'player2' && this.player1)
      
      // NOTRE bannière (en haut) bouge selon notre état ready
      const myBanner = this.characterBanners[myCharacter]
      
      if (myBanner) {
        if (myReady) {
          // Prêt : bannière en position normale (x=0)
          if (myBanner.x !== 0) {
            this.tweens.add({
              targets: myBanner,
              x: 0,
              duration: 500,
              ease: 'Power2'
            });
          }
        } else {
          // Pas prêt : bannière toujours à gauche (x=-250), peu importe le sprite
          const targetX = -250
          if (myBanner.x !== targetX) {
            this.tweens.add({
              targets: myBanner,
              x: targetX,
              duration: 500,
              ease: 'Power2'
            });
          }
        }
      }
      
      // Bannière de L'ADVERSAIRE (en bas) bouge selon son état ready
      const opponentBanner = this.opponentBanners[opponentCharacter]
      
      if (opponentBanner) {
        if (opponentReady) {
          // Adversaire prêt : bannière en position normale (x=0)
          if (opponentBanner.x !== 0) {
            this.tweens.add({
              targets: opponentBanner,
              x: 0,
              duration: 500,
              ease: 'Power2'
            });
          }
        } else {
          // Adversaire pas prêt : bannière décalée à droite (x=250), peu importe le sprite
          const targetX = 250
          if (opponentBanner.x !== targetX) {
            this.tweens.add({
              targets: opponentBanner,
              x: targetX,
              duration: 500,
              ease: 'Power2'
            });
          }
        }
      }
    }
  }

  getNameLabel() {
    return this.playerName ? `Nickname: ${this.playerName}` : 'Nickname: (not set)'
  }

  setPhase(phase) {
    this.currentPhase = phase
    const isMenu = phase === 'main_menu'
    this.playBtn.setVisible(isMenu)
    this.nameBtn.setVisible(isMenu)
    this.characterBtn.setVisible(isMenu)
    this.cancelBtn.setVisible(phase === 'matchmaking')

    const showMatchBanners = phase === 'found'
    this.topBars?.setVisible(showMatchBanners)
    this.bottomBars?.setVisible(showMatchBanners)
    
    if (showMatchBanners) {
      // Phase 'found' : affiche notre bannière en haut et celle de l'adversaire en bas
      this.showMatchBanners()
    } else {
      // Menu principal : affiche seulement notre bannière
      this.showMainMenuBanner()
    }
    this.myNameText?.setVisible(showMatchBanners)
    this.opponentNameText?.setVisible(showMatchBanners)
  }
  
  getCharacterButtonLabel() {
    const config = getCharacterConfig(this.selectedCharacter)
    return `Character: ${config ? config.displayName : 'Unknown'}`
  }
  
  toggleCharacter() {
    const available = getAvailableCharacters()
    const currentIndex = available.indexOf(this.selectedCharacter)
    const nextIndex = (currentIndex + 1) % available.length
    this.selectedCharacter = available[nextIndex]
    window.localStorage.setItem('kirby_selected_character', this.selectedCharacter)
    this.characterBtn.setText(this.getCharacterButtonLabel())
    this.updateCharacterBanner()
  }
  
  showMainMenuBanner() {
    // Arrête tous les tweens actifs sur les bannières pour éviter les conflits
    const allBanners = [...Object.values(this.characterBanners), ...Object.values(this.opponentBanners)]
    this.tweens.killTweensOf(allBanners)
    
    // Cache toutes les bannières
    Object.values(this.characterBanners).forEach(b => b?.setVisible(false))
    Object.values(this.opponentBanners).forEach(b => b?.setVisible(false))
    
    // Affiche seulement notre bannière en haut selon notre skin choisi
    const myCharacter = normalizeCharacter(this.selectedCharacter)
    const myBanner = this.characterBanners[myCharacter]
    if (myBanner) {
      setupBanner(myBanner, myCharacter, false)
    }
  }
  
  showMatchBanners() {
    // Récupère les skins avec normalisation
    const myCharacter = normalizeCharacter(this.selectedCharacter)
    const opponentCharacter = normalizeCharacter(
      window.localStorage.getItem('kirby_opponent_character')
    )
    
    console.log('=== showMatchBanners ===')
    console.log('Notre skin:', myCharacter, 'Adversaire:', opponentCharacter)
    // IMPORTANT: Les deux joueurs peuvent avoir le même skin, c'est géré par le système modulaire
    console.log('========================')
    
    // Cache toutes les bannières d'abord
    Object.values(this.characterBanners).forEach(b => b?.setVisible(false))
    Object.values(this.opponentBanners).forEach(b => b?.setVisible(false))
    
    // NOTRE bannière en haut (pas de flip)
    const myBanner = this.characterBanners[myCharacter]
    if (myBanner) {
      setupBanner(myBanner, myCharacter, false)
    }
    
    // Bannière de L'ADVERSAIRE en bas (avec flip)
    // IMPORTANT: Utilise les instances séparées pour l'adversaire, même si c'est le même skin que nous
    const opponentBanner = this.opponentBanners[opponentCharacter]
    if (opponentBanner) {
      setupBanner(opponentBanner, opponentCharacter, true)
      console.log(`Bannière adversaire ${opponentCharacter} affichée en bas`)
    } else {
      console.error('Bannière adversaire introuvable pour:', opponentCharacter)
    }
  }
  
  updateCharacterBanner() {
    // Alias pour compatibilité
    this.showMainMenuBanner()
  }

  onPlay() {
    if (!this.playerName) {
      this.openNameInput(() => this.joinQueue())
      return
    }
    this.joinQueue()
  }

  joinQueue() {
    setStatusMessage('Searching for an opponent...')
    this.setPhase('matchmaking')
    const myCharacter = normalizeCharacter(this.selectedCharacter)
    console.log('Envoi join_queue avec character:', myCharacter)
    socket.emit('join_queue', { name: this.playerName, character: myCharacter })
  }

  onCancel() {
    socket.emit('leave_queue')
    setStatusMessage('')
    this.setPhase('main_menu')
  }

  openNameInput(onDone) {
    this.setPhase('main_menu')
    setStatusMessage('')

    if (this.nameDom) {
      this.nameDom.destroy()
      this.nameDom = null
    }

    const html = `
      <div style="display:flex; flex-direction:column; gap:8px; align-items:center;">
        <input id="kirbyName" type="text" maxlength="16" placeholder="Ton pseudo"
          value="${escapeHtml(this.playerName)}"
          style="width:240px; padding:10px; font-size:12px; border-radius:8px; border:1px solid #ccc; font-family: var(--kirby-font);" />
        <button id="kirbyOk" style="width:240px; padding:10px; font-size:12px; border-radius:8px; border:0; background:#ffffff; cursor:pointer; font-family: var(--kirby-font);">
          Valider
        </button>
      </div>
    `

    this.nameDom = this.add.dom(256, 222).createFromHTML(html)
    const input = this.nameDom.getChildByID('kirbyName')
    const ok = this.nameDom.getChildByID('kirbyOk')

    const submit = () => {
      const value = (input?.value || '').trim()
      this.playerName = value
      window.localStorage.setItem('kirby_player_name', value)
      refreshHud?.()
      this.nameText.setText(this.getNameLabel())
      this.nameDom?.destroy()
      this.nameDom = null
      if (typeof onDone === 'function') onDone()
    }

    ok?.addEventListener('click', submit)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit()
    })
    input?.focus?.()
  }

  makeButton(x, y, label, onClick) {
    const t = this.add.text(x, y, label, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '18px',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.35)',
      padding: { left: 12, right: 12, top: 8, bottom: 8 }
    }).setOrigin(0.5)
    t.setResolution(2)

    t.setInteractive({ useHandCursor: true })
    t.on('pointerdown', () => onClick?.())
    t.on('pointerover', () => t.setStyle({ backgroundColor: 'rgba(0,0,0,0.55)' }))
    t.on('pointerout', () => t.setStyle({ backgroundColor: 'rgba(0,0,0,0.35)' }))
    return t
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
