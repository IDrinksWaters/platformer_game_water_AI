/**
 * ParticleManager Class
 * Manages all particle emitters for the game: run dust, jump/land puffs,
 * and coin/cup collection bursts. All particles use a single 4x4 white
 * pixel texture generated programmatically, with different tints per emitter.
 */
class ParticleManager {
    /**
     * @param {Phaser.Scene} scene - The scene these particles belong to
     */
    constructor(scene) {
        this.scene = scene;

        // Generate the shared particle texture: a 4x4 white pixel
        const gfx = scene.make.graphics({ add: false });
        gfx.fillStyle(0xffffff);
        gfx.fillRect(0, 0, 4, 4);
        gfx.generateTexture('particle', 4, 4);
        gfx.destroy();

        // Create all emitters (all start in emitting: false mode)
        this._createEmitters();
    }

    /** Creates the five particle emitters defined in DESIGN.md */
    _createEmitters() {
        // Run-left dust: gray, emitted while running left on ground
        this.runLeft = this.scene.add.particles(0, 0, 'particle', {
            speed: { min: 10, max: 40 },
            angle: { min: 0, max: 40 },
            scale: { start: 0.6, end: 0 },
            lifespan: 250,
            frequency: 60,
            tint: 0xaaaaaa,
            emitting: false
        });

        // Run-right dust: gray, emitted while running right on ground
        this.runRight = this.scene.add.particles(0, 0, 'particle', {
            speed: { min: 10, max: 40 },
            angle: { min: 140, max: 180 },
            scale: { start: 0.6, end: 0 },
            lifespan: 250,
            frequency: 60,
            tint: 0xaaaaaa,
            emitting: false
        });

        // Jump puff: white, burst of 10 at player's feet
        this.jump = this.scene.add.particles(0, 0, 'particle', {
            speed: { min: 40, max: 120 },
            angle: { min: 220, max: 320 },
            scale: { start: 0.8, end: 0 },
            lifespan: 300,
            tint: 0xffffff,
            emitting: false
        });

        // Land puff: white, burst of 14 when touching ground
        this.land = this.scene.add.particles(0, 0, 'particle', {
            speed: { min: 30, max: 100 },
            angle: { min: 180, max: 360 },
            scale: { start: 0.7, end: 0 },
            lifespan: 300,
            tint: 0xffffff,
            emitting: false
        });

        // Collect burst: gold, used for coin and cup collection
        this.collect = this.scene.add.particles(0, 0, 'particle', {
            speed: { min: 60, max: 180 },
            angle: { min: 0, max: 360 },
            scale: { start: 0.9, end: 0 },
            lifespan: 400,
            tint: 0xffdd00,
            emitting: false
        });
    }

    /**
     * Per-frame update: positions the run emitters at the player's feet,
     * offset slightly in the direction of movement.
     * @param {Phaser.Physics.Arcade.Sprite} playerSprite
     */
    updateRunEmitters(playerSprite) {
        const vx = playerSprite.body.velocity.x;
        const isGrounded = playerSprite.body.blocked.down;

        // Position at the bottom of the player, offset ±4px based on direction
        const feetY = playerSprite.y + playerSprite.height / 2;

        // Only emit run particles when moving on ground
        if (vx < -10 && isGrounded) {
            this.runLeft.setPosition(playerSprite.x - 4, feetY);
            this.runLeft.emitting = true;
        } else {
            this.runLeft.emitting = false;
        }

        if (vx > 10 && isGrounded) {
            this.runRight.setPosition(playerSprite.x + 4, feetY);
            this.runRight.emitting = true;
        } else {
            this.runRight.emitting = false;
        }
    }

    /**
     * Emits a jump puff at the player's feet.
     * @param {Phaser.Physics.Arcade.Sprite} playerSprite
     */
    burstJump(playerSprite) {
        const feetY = playerSprite.y + playerSprite.height / 2;
        this.jump.setPosition(playerSprite.x, feetY);
        this.jump.explode(10);
    }

    /**
     * Emits a landing puff at the player's feet.
     * @param {Phaser.Physics.Arcade.Sprite} playerSprite
     */
    burstLand(playerSprite) {
        const feetY = playerSprite.y + playerSprite.height / 2;
        this.land.setPosition(playerSprite.x, feetY);
        this.land.explode(14);
    }

    /**
     * Emits a gold collection burst at a given position.
     * @param {number} x - World X position
     * @param {number} y - World Y position
     * @param {number} count - Number of particles (12 for coins, 20 for cup)
     */
    burstCollect(x, y, count = 12) {
        this.collect.setPosition(x, y);
        this.collect.explode(count);
    }

    /** Stops all emitters immediately */
    stopAll() {
        this.runLeft.emitting = false;
        this.runRight.emitting = false;
        this.jump.emitting = false;
        this.land.emitting = false;
        this.collect.emitting = false;
    }
}
