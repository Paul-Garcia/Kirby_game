import Phaser from 'phaser'

export class GravityScene extends Phaser.Scene {
  constructor() {
    super('GravityScene')
    this.objects = []
    this.gravity = 0.5
    this.groundY = 0
  }

  preload() {
    this.load.image('cube', './gravity/kirb.png') // Remplace par le chemin réel de ton image
    // Charge les 3 backgrounds pour sélection aléatoire
    this.load.image('background1', './gravity/back.png')
    // this.load.image('background2', './gravity/back2.png')
    // this.load.image('background3', './gravity/back3.png')
  }
  
  create() {
    // Sélectionne un background aléatoire parmi les 3
    // const bgIndex = Phaser.Math.Between(1, 3)
    // const bgKey = `background${bgIndex}`
    const bgKey = `background${1}`
    
    // Couleur en bas : #00f0f8 pour back.png (ancien), #f8b050 pour back2/back3 (nouveaux)
    // const bottomColor = bgIndex === 2 ? 0x00f0f8 : bgIndex === 3 ? 0xf8b050 : 0x2020b0
    // this.cameras.main.setBackgroundColor(bottomColor)
    this.cameras.main.setBackgroundColor(0x2020b0)
    
    const bgHeight = this.textures.get(bgKey).getSourceImage().height;

    this.bg = this.add.tileSprite(0, 0, this.scale.width, bgHeight, bgKey)
      .setOrigin(0, 0);


    this.groundY = this.scale.height + 10
    this.scale.on('resize', this.handleResize, this)

    console.log('Hauteur de l\'écran :', this.groundY)
    this.time.addEvent({
      delay: 500,
      callback: this.spawnObject,
      callbackScope: this,
      loop: true
    })
  }

  spawnObject() {
    const size = Phaser.Math.Between(20, 40)
    const x = Phaser.Math.Between(size / 2, this.scale.width - size / 2)

    const img = this.add.image(x, 0, 'cube')
    img.setDisplaySize(size, size)  // adapte la taille pour correspondre au carré

    this.objects.push({
      sprite: img,
      vx: Phaser.Math.FloatBetween(-2, 2),
      vy: 0,
      size: size,
      angularVelocity: Phaser.Math.FloatBetween(-0.75, 0.75),
      angle: 0
    })
  }

  handleResize(gameSize) {
    const width = gameSize.width
    const height = gameSize.height
  
    this.groundY = height  

    if (this.bg) {
      this.bg.setSize(width, this.bg.height);
    }
  }

  // --- Fonctions GJK intégrées dans la classe ---

  _farthestPoint(points, dir) {
    let maxDot = -Infinity
    let farthest = null
    for (const p of points) {
      const dot = p.x * dir.x + p.y * dir.y
      if (dot > maxDot) {
        maxDot = dot
        farthest = p
      }
    }
    return farthest
  }

  _getRectanglePoints(obj) {
    const cx = obj.sprite.x
    const cy = obj.sprite.y
    const size = obj.size / 2
    const angle = obj.angle

    const cos = Math.cos(angle)
    const sin = Math.sin(angle)

    const localPoints = [
      {x: -size, y: -size},
      {x: size, y: -size},
      {x: size, y: size},
      {x: -size, y: size},
    ]

    return localPoints.map(p => ({
      x: cx + p.x * cos - p.y * sin,
      y: cy + p.x * sin + p.y * cos
    }))
  }

  _support(objA, objB, dir) {
    const pointsA = this._getRectanglePoints(objA)
    const pointsB = this._getRectanglePoints(objB)

    const p1 = this._farthestPoint(pointsA, dir)
    const negDir = {x: -dir.x, y: -dir.y}
    const p2 = this._farthestPoint(pointsB, negDir)

    return {x: p1.x - p2.x, y: p1.y - p2.y}
  }

  _subtract(a, b) {
    return {x: a.x - b.x, y: a.y - b.y}
  }

  _cross2D(a, b) {
    return a.x * b.y - a.y * b.x
  }

  _gjkSimplex(simplex, direction) {
    const a = simplex[simplex.length - 1]

    if (simplex.length === 1) {
      direction.x = -a.x
      direction.y = -a.y
      return false
    }

    if (simplex.length === 2) {
      const b = simplex[0]
      const ab = this._subtract(b, a)
      const ao = {x: -a.x, y: -a.y}

      let abPerp = {x: -ab.y, y: ab.x}
      if (this._cross2D(ab, ao) > 0) {
        abPerp = {x: ab.y, y: -ab.x}
      }

      direction.x = abPerp.x
      direction.y = abPerp.y
      return false
    }

    if (simplex.length === 3) {
      const b = simplex[1]
      const c = simplex[0]

      const ab = this._subtract(b, a)
      const ac = this._subtract(c, a)
      const ao = {x: -a.x, y: -a.y}

      const abPerp = {x: -ab.y, y: ab.x}
      const acPerp = {x: ac.y, y: -ac.x}

      if (this._cross2D(ab, ao) > 0) {
        simplex.splice(0, 1)
        direction.x = abPerp.x
        direction.y = abPerp.y
        return false
      } else if (this._cross2D(ac, ao) > 0) {
        simplex.splice(1, 1)
        direction.x = acPerp.x
        direction.y = acPerp.y
        return false
      } else {
        return true
      }
    }

    return false
  }

  _gjk(objA, objB) {
    let direction = {x: 1, y: 0}
    let simplex = []

    simplex.push(this._support(objA, objB, direction))
    direction = {x: -simplex[0].x, y: -simplex[0].y}

    let iterations = 0
    while (iterations < 20) {
      const A = this._support(objA, objB, direction)
      if ((A.x * direction.x + A.y * direction.y) <= 0) {
        return false
      }

      simplex.push(A)

      if (this._gjkSimplex(simplex, direction)) {
        return true
      }

      iterations++
    }

    return false
  }


  update() {

    if (this.objects.length > 20) {
      const excess = this.objects.length - 20;
    
      // Séparer objets au sol et en mouvement
      const onGround = [];
      const inAir = [];
    
      for (const obj of this.objects) {
        const isOnGround = obj.vy === 0 && obj.sprite.y + obj.size / 2 >= this.groundY - 10;
        if (isOnGround) {
          onGround.push(obj);
        } else {
          inAir.push(obj);
        }
      }
    
      // Supprimer d'abord ceux au sol
      const toRemove = onGround.slice(0, excess);
    
      // Si pas assez au sol, supprimer aussi ceux en l'air
      if (toRemove.length < excess) {
        const remaining = excess - toRemove.length;
        toRemove.push(...inAir.slice(0, remaining));
      }
    
      // Supprimer les sprites et filtrer la liste
      toRemove.forEach(obj => obj.sprite.destroy());
    
      this.objects = this.objects.filter(obj => !toRemove.includes(obj));
    }

    for (const obj of this.objects) {
      obj.vy += this.gravity
      obj.sprite.x += obj.vx
      obj.sprite.y += obj.vy

      obj.angle += obj.angularVelocity
      obj.sprite.rotation = obj.angle

      if (obj.sprite.x - obj.size / 2 <= 0) {
        obj.sprite.x = obj.size / 2
        obj.vx = -obj.vx * 0.7
        obj.angularVelocity = -obj.angularVelocity
      } else if (obj.sprite.x + obj.size / 2 >= this.scale.width) {
        obj.sprite.x = this.scale.width - obj.size / 2
        obj.vx = -obj.vx * 0.7
        obj.angularVelocity = -obj.angularVelocity
      }

      if (obj.sprite.y + obj.size / 2 >= this.groundY - 10) {
        obj.sprite.y = this.groundY - 10 - obj.size / 2
        obj.vy = -obj.vy * 0.5
        obj.angularVelocity *= 0.5
        obj.vx *= 0.8

        if (Math.abs(obj.vy) < 1) {
          obj.vy = 0
          obj.angularVelocity = 0
          obj.vx = 0
        }
      }
    }

    // Test des collisions entre objets (GJK)
    for (let i = 0; i < this.objects.length; i++) {
      for (let j = i + 1; j < this.objects.length; j++) {
        const objA = this.objects[i]
        const objB = this.objects[j]

        if (this._gjk(objA, objB)) {
          console.log('Collision détectée entre objets !')
          // Ici tu peux faire ta résolution (par ex inverser les vitesses, repositionner, etc.)
        }
      }
    }
  }
}
