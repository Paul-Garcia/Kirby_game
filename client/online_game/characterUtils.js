/**
 * Système modulaire de gestion des personnages
 * 
 * ============================================
 * COMMENT AJOUTER UN NOUVEAU PERSONNAGE
 * ============================================
 * 
 * Pour ajouter un nouveau personnage (ex: "mario"), il suffit de :
 * 
 * 1. Créer un dossier characters/mario/ dans client/online_game/
 * 
 * 2. Ajouter les fichiers dans characters/mario/ :
 *    - mario.png (sprite atlas)
 *    - mario.json (définition des frames avec les frames: mario1, mario2, mario3, mario4)
 *    - mario_banner.png (bannière de 512x92px)
 * 
 * 3. Ajouter la configuration dans CHARACTER_CONFIGS ci-dessous :
 *    mario: {
 *      id: 'mario',
 *      displayName: 'Mario',
 *      atlasKey: 'mario',  // doit correspondre au nom du fichier .png/.json
 *      frames: {
 *        idle: 'mario1',   // frame au repos
 *        win: 'mario2',    // frame de victoire (statique, ou première frame si winFrames existe)
 *        lose: 'mario4'    // frame de défaite (statique, ou première frame si loseFrames existe)
 *      },
 *      dashFrames: ['mario1', 'mario2', 'mario3', 'mario4'], // animation de course
 *      winFrames: ['mario2', 'mario3'], // (optionnel) animation de victoire
 *      loseFrames: ['mario4', 'mario5'] // (optionnel) animation de défaite
 *    }
 * 
 * 4. C'est tout ! Le système chargera automatiquement les assets depuis characters/mario/
 *    et les utilisera partout.
 * 
 * IMPORTANT : Le système gère automatiquement le cas où les deux joueurs ont le même skin.
 * Les bannières utilisent des textures séparées pour éviter les conflits d'affichage.
 * 
 * Structure des dossiers :
 *   online_game/
 *     characters/
 *       kirby/
 *         kirb.png
 *         kirb.json
 *         kirby_banner.png
 *       waddle/
 *         waddle.png
 *         waddle.json
 *       waddle_banner.png
 *       meta/
 *         meta.png
 *         meta.json
 *         meta_banner.png
 */

// Liste des personnages connus (peut être étendue automatiquement)
// Format: { id: 'nom', displayName: 'Nom Affiché', frames: { idle: 'frame1', win: 'frame2', lose: 'frame4' } }
const CHARACTER_CONFIGS = {
  kirby: {
    id: 'kirby',
    displayName: 'Kirby',
    atlasKey: 'kirb',
    frames: {
      idle: 'kirb1',
      win: 'kirb2',
      lose: 'kirb4'
    },
    dashFrames: ['kirb1', 'kirb1', 'kirb1', 'kirb1'] // Animation de course
  },
  waddle: {
    id: 'waddle',
    displayName: 'Waddle',
    atlasKey: 'waddle',
    frames: {
      idle: 'waddle1',
      win: 'waddle2',
      lose: 'waddle4'
    },
    dashFrames: ['waddle1', 'waddle2', 'waddle3', 'waddle4'] // Animation de course
  },
  meta: {
    id: 'meta',
    displayName: 'MetaKnight',
    atlasKey: 'meta',
    frames: {
      idle: 'meta1',
      win: 'meta2',
      lose: 'meta6'
    },
    dashFrames: ['meta2'], // Animation de course
    loseFrames: ['meta3','meta4','meta5','meta4','meta5','meta4','meta5'] // Animation de défaite
  },
  kawa: {
    id: 'kawa',
    displayName: 'Kawasaki',
    atlasKey: 'kawa',
    frames: {
      idle: 'kawa8',
      win: 'kawa1',
      lose: 'kawa7'
    },
    dashFrames: ['kawa1', 'kawa2', 'kawa3', 'kawa4'], // Animation de course
    loseFrames: ['kawa7', 'kawa6', 'kawa5'] // Animation de défaite
  },
  dede: {
    id: 'dede',
    displayName: 'King Dede',
    atlasKey: 'dede',
    frames: {
      idle: 'dede4',
      win: 'dede2',
      lose: 'dede1'
    },
    dashFrames: ['dede2', 'dede3'], // Animation de course
  },
  wheel: {
    id: 'wheel',
    displayName: 'Wheelie',
    atlasKey: 'wheel',
    frames: {
      idle: 'wheel10',
      win: 'wheel10',
      lose: 'wheel10'
    },
    dashFrames: ['wheel8', 'wheel9', 'wheel8', 'wheel9'], // Animation de course
    loseFrames: ['wheel7', 'wheel6', 'wheel5', 'wheel4', 'wheel3', 'wheel2', 'wheel1'] // Animation de défaite
  },
}

// Personnage par défaut
const DEFAULT_CHARACTER = 'kirby'

/**
 * Normalise un nom de personnage (tolowercase, validation)
 */
export function normalizeCharacter(characterName, fallback = DEFAULT_CHARACTER) {
  if (!characterName) return fallback
  const normalized = characterName.toLowerCase().trim()
  return CHARACTER_CONFIGS[normalized] ? normalized : fallback
}

/**
 * Récupère la configuration d'un personnage
 */
export function getCharacterConfig(characterId) {
  return CHARACTER_CONFIGS[normalizeCharacter(characterId)] || CHARACTER_CONFIGS[DEFAULT_CHARACTER]
}

/**
 * Récupère tous les personnages disponibles
 */
export function getAvailableCharacters() {
  return Object.keys(CHARACTER_CONFIGS)
}

/**
 * Charge tous les assets d'un personnage
 * Les fichiers sont organisés dans characters/{characterId}/
 */
export function loadCharacterAssets(scene, characterId) {
  const config = getCharacterConfig(characterId)
  if (!config) {
    console.warn(`[characterUtils] Personnage inconnu: ${characterId}`)
    return
  }

  // Chemin de base pour le personnage dans le dossier characters/
  const characterBasePath = `./online_game/characters/${characterId}`

  // Charge l'atlas du sprite
  const atlasPath = `${characterBasePath}/${config.atlasKey}.png`
  const jsonPath = `${characterBasePath}/${config.atlasKey}.json`
  scene.load.atlas(config.atlasKey, atlasPath, jsonPath)
  
  // Charge la bannière
  const bannerKey = `${characterId}_banner`
  const bannerOpponentKey = `${characterId}_banner_opponent` // Texture séparée pour l'adversaire
  const bannerPath = `${characterBasePath}/${characterId}_banner.png`
  scene.load.spritesheet(bannerKey, bannerPath, { frameWidth: 512, frameHeight: 92 })
  scene.load.spritesheet(bannerOpponentKey, bannerPath, { frameWidth: 512, frameHeight: 92 })
  
  console.log(`[characterUtils] Assets chargés pour: ${characterId} depuis ${characterBasePath}`)
}

/**
 * Charge tous les assets de tous les personnages disponibles
 */
export function loadAllCharacterAssets(scene) {
  const characters = getAvailableCharacters()
  characters.forEach(charId => loadCharacterAssets(scene, charId))
  console.log(`[characterUtils] Tous les assets chargés pour ${characters.length} personnage(s)`)
}

/**
 * Crée une animation de course pour un personnage
 */
export function createDashAnimation(scene, characterId) {
  const config = getCharacterConfig(characterId)
  if (!config) return

  const animKey = `${config.atlasKey}_dash`
  
  // Vérifie si l'animation existe déjà
  if (scene.anims.exists(animKey)) {
    return
  }

  const frames = config.dashFrames.map(frameName => ({
    key: config.atlasKey,
    frame: frameName
  }))

  scene.anims.create({
    key: animKey,
    frames: frames,
    frameRate: 10,
    repeat: -1
  })

  console.log(`[characterUtils] Animation '${animKey}' créée pour ${characterId}`)
}

/**
 * Crée toutes les animations de course
 */
export function createAllDashAnimations(scene) {
  const characters = getAvailableCharacters()
  characters.forEach(charId => createDashAnimation(scene, charId))
}

/**
 * Crée une animation de défaite pour un personnage (si loseFrames est défini)
 */
export function createLoseAnimation(scene, characterId) {
  const config = getCharacterConfig(characterId)
  if (!config || !config.loseFrames) return

  const animKey = `${config.atlasKey}_lose`
  
  // Vérifie si l'animation existe déjà
  if (scene.anims.exists(animKey)) {
    return
  }

  const frames = config.loseFrames.map(frameName => ({
    key: config.atlasKey,
    frame: frameName
  }))

  scene.anims.create({
    key: animKey,
    frames: frames,
    frameRate: 8, // Frame rate un peu plus lent pour l'animation de défaite
    repeat: 0 // Ne répète pas l'animation (joue une seule fois)
  })

  console.log(`[characterUtils] Animation de défaite '${animKey}' créée pour ${characterId}`)
}

/**
 * Crée toutes les animations de défaite (pour les personnages qui ont loseFrames)
 */
export function createAllLoseAnimations(scene) {
  const characters = getAvailableCharacters()
  characters.forEach(charId => createLoseAnimation(scene, charId))
}

/**
 * Crée une animation de victoire pour un personnage (si winFrames est défini)
 */
export function createWinAnimation(scene, characterId) {
  const config = getCharacterConfig(characterId)
  if (!config || !config.winFrames) return

  const animKey = `${config.atlasKey}_win`
  
  // Vérifie si l'animation existe déjà
  if (scene.anims.exists(animKey)) {
    return
  }

  const frames = config.winFrames.map(frameName => ({
    key: config.atlasKey,
    frame: frameName
  }))

  scene.anims.create({
    key: animKey,
    frames: frames,
    frameRate: 8, // Frame rate un peu plus lent pour l'animation de victoire
    repeat: 0 // Ne répète pas l'animation (joue une seule fois)
  })

  console.log(`[characterUtils] Animation de victoire '${animKey}' créée pour ${characterId}`)
}

/**
 * Crée toutes les animations de victoire (pour les personnages qui ont winFrames)
 */
export function createAllWinAnimations(scene) {
  const characters = getAvailableCharacters()
  characters.forEach(charId => createWinAnimation(scene, charId))
}

/**
 * Crée un sprite de personnage
 * @param {Phaser.Scene} scene - La scène Phaser
 * @param {string} characterId - ID du personnage
 * @param {number} x - Position X
 * @param {number} y - Position Y
 * @param {boolean} flipped - Si le sprite doit être retourné horizontalement
 * @param {number} rightX - Position X de référence pour le calcul de symétrie (si flipped)
 * @returns {Phaser.GameObjects.Sprite} Le sprite créé
 */
export function createCharacterSprite(scene, characterId, x, y, flipped = false, rightX = null) {
  const config = getCharacterConfig(characterId)
  if (!config) {
    console.warn(`[characterUtils] Impossible de créer le sprite pour ${characterId}, utilisation du défaut`)
    return createCharacterSprite(scene, DEFAULT_CHARACTER, x, y, flipped, rightX)
  }

  const sprite = scene.add.sprite(x, y, config.atlasKey, config.frames.idle)
    .setOrigin(0, 1)
    .setDepth(2)

  if (flipped) {
    sprite.setFlipX(true)
    // Ajuste la position X pour la symétrie : quand le sprite est flipé avec origine en bas gauche,
    // il faut soustraire sa largeur pour que le point de référence soit en bas droite
    if (rightX !== null) {
      sprite.x = rightX - sprite.displayWidth
    } else {
      sprite.x = x - sprite.displayWidth
    }
  }

  console.log(`[characterUtils] Sprite ${characterId} créé à x:${sprite.x}, y:${y}, flipped:${flipped}`)
  return sprite
}

/**
 * Définit la frame d'un sprite selon l'état (idle, win, lose)
 * Si winFrames/loseFrames est défini et state correspond, joue l'animation
 */
export function setCharacterFrame(sprite, characterId, state) {
  const config = getCharacterConfig(characterId)
  if (!config || !sprite) return

  // Si c'est une victoire et qu'une animation de victoire existe, on la joue
  if (state === 'win' && config.winFrames) {
    const animKey = `${config.atlasKey}_win`
    if (sprite.scene && sprite.scene.anims.exists(animKey)) {
      // Arrête toutes les animations en cours (comme dash) avant de jouer l'animation de victoire
      sprite.stop()
      sprite.play(animKey)
      console.log(`[characterUtils] Animation de victoire '${animKey}' jouée pour ${characterId}`)
      return
    }
  }

  // Si c'est une défaite et qu'une animation de défaite existe, on la joue
  if (state === 'lose' && config.loseFrames) {
    const animKey = `${config.atlasKey}_lose`
    if (sprite.scene && sprite.scene.anims.exists(animKey)) {
      // Arrête toutes les animations en cours (comme dash) avant de jouer l'animation de défaite
      sprite.stop()
      sprite.play(animKey)
      console.log(`[characterUtils] Animation de défaite '${animKey}' jouée pour ${characterId}`)
      return
    }
  }

  // Sinon, on utilise la frame statique
  const frameKey = config.frames[state] || config.frames.idle
  sprite.setFrame(frameKey)
  
  console.log(`[characterUtils] Frame ${state} (${frameKey}) définie pour ${characterId}`)
}

/**
 * Ajuste la position d'un sprite flipé après changement de frame
 */
export function adjustFlippedSpritePosition(sprite, rightX) {
  if (!sprite || !sprite.flipX) return
  sprite.x = rightX - sprite.displayWidth
}

/**
 * Initialise les bannières pour un personnage
 * @param {Phaser.Scene} scene - La scène Phaser
 * @param {string} characterId - ID du personnage
 * @param {boolean} isOpponent - Si c'est pour l'adversaire (utilise texture séparée)
 * @returns {Phaser.GameObjects.Sprite} La bannière créée
 */
export function createBanner(scene, characterId, isOpponent = false) {
  const config = getCharacterConfig(characterId)
  if (!config) {
    console.warn(`[characterUtils] Impossible de créer la bannière pour ${characterId}`)
    return null
  }

  const bannerKey = isOpponent ? `${characterId}_banner_opponent` : `${characterId}_banner`
  const y = isOpponent ? 444 : 0
  const originY = isOpponent ? 1 : 0

  const banner = scene.add.sprite(0, y, bannerKey, 0)
    .setOrigin(0, originY)
    .setDepth(2)
    .setVisible(false)

  if (isOpponent) {
    banner.setFlipX(true)
    // Ajuste la position X pour la symétrie
    const screenWidth = 512
    banner.x = screenWidth - banner.displayWidth
  }

  console.log(`[characterUtils] Bannière ${characterId} créée (opponent: ${isOpponent})`)
  return banner
}

/**
 * Initialise toutes les bannières (notre personnage + adversaire)
 * @returns {Object} { my: { characterId: banner }, opponent: { characterId: banner } }
 */
export function initializeBanners(scene) {
  const characters = getAvailableCharacters()
  const myBanners = {}
  const opponentBanners = {}

  characters.forEach(charId => {
    myBanners[charId] = createBanner(scene, charId, false)
    opponentBanners[charId] = createBanner(scene, charId, true)
  })

  return { my: myBanners, opponent: opponentBanners }
}

/**
 * Configure une bannière pour l'affichage
 */
export function setupBanner(banner, characterId, isOpponent = false) {
  if (!banner) return

  const config = getCharacterConfig(characterId)
  if (!config) return

  banner.setFrame(0)
  banner.setVisible(true)

  if (isOpponent) {
    const screenWidth = 512
    banner.setPosition(screenWidth, 444)
    banner.setOrigin(0, 1)
    banner.setFlipX(true)
    banner.x = screenWidth - banner.displayWidth
  } else {
    banner.setPosition(0, 0)
    banner.setOrigin(0, 0)
    banner.setFlipX(false)
  }
}

/**
 * Récupère le personnage par défaut
 */
export function getDefaultCharacter() {
  return DEFAULT_CHARACTER
}

// Export des configurations pour référence externe
export { CHARACTER_CONFIGS }
