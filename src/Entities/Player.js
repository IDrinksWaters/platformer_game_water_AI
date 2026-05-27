/**
 * Player Class
 * Handles player sprite, movement, animations, health, invincibility, and knockback.
 * All movement uses acceleration/drag physics as specified in DESIGN.md.
 */
class Player {
    /**
     * @param {Phaser.Scene} scene - The scene this player belongs to
     * @param {number} x - Spawn X position (world coordinates)
     * @param {number} y - Spawn Y position (world coordinates)
     */
    constructor(scene, x, y) {
        this.scene = scene;
        this.spawnX = x;
        this.spawnY = y;

        // Movement parameters from DESIGN.md
        this.ACCELERATION = 300;
        this.DRAG = 2000;
        this.JUMP_VELOCITY = -400;
        this.JUMP_UPGRADE_INCREMENT = -75;

        // Health system
        this.MAX_HEALTH = 3;
        this.health = this.MAX_HEALTH;
        this.isAlive = true;

        // Invincibility state
        this.isInvincible = false;
        this.invincibleTimer = null;
        this.blinkTimer = null;

        // Flag to lock controls during water-unlock sequence
        this.controlsLocked = false;

        // Create the sprite and physics body
        this._createSprite(x, y);
        this._createAnimations();
    }

    /** Creates the player sprite and configures its physics body */
    _createSprite(x, y) {
        // Frame 280 = idle frame from the transparent sprite sheet
        this.sprite = this.scene.physics.add.sprite(x, y, 'tilemap_sheet', 280);

        // Prevent the player from leaving the physics world bounds
        this.sprite.setCollideWorldBounds(true);

        // Set maximum velocity to cap horizontal and vertical speed
        this.sprite.setMaxVelocity(300, 800);

        // Drag is set dynamically in update() — only applied when no key is held
    }

    /** Defines the player's walk, idle, and jump animations (idempotent) */
    _createAnimations() {
        // Only create if they don't already exist (survives scene restarts)
        if (!this.scene.anims.exists('walk')) {
            this.scene.anims.create({
                key: 'walk',
                // Walk frames 284 → 283 per DESIGN.md order
                frames: [
                    { key: 'tilemap_sheet', frame: 284 },
                    { key: 'tilemap_sheet', frame: 283 }
                ],
                frameRate: 8,
                repeat: -1
            });
        }

        if (!this.scene.anims.exists('idle')) {
            this.scene.anims.create({
                key: 'idle',
                frames: [{ key: 'tilemap_sheet', frame: 280 }],
                frameRate: 1,
                repeat: 0
            });
        }

        if (!this.scene.anims.exists('jump')) {
            this.scene.anims.create({
                key: 'jump',
                frames: [{ key: 'tilemap_sheet', frame: 285 }],
                frameRate: 1,
                repeat: 0
            });
        }
    }

    /**
     * Per-frame update: handles input, movement, animation selection,
     * and sprite flipping. Drag is only applied when no key is held.
     * @param {Phaser.Types.Input.Keyboard.CursorKeys} cursors
     */
    update(cursors) {
        if (!this.isAlive || this.controlsLocked) {
            // When controls are locked, zero out acceleration and velocity
            this.sprite.setAccelerationX(0);
            this.sprite.setVelocityX(0);
            this.sprite.setDragX(0);
            return;
        }

        const isGrounded = this.sprite.body.blocked.down;

        // --- Horizontal Movement ---
        // Acceleration is applied while a key is held; drag is applied when no key is held
        if (cursors.left.isDown) {
            this.sprite.setAccelerationX(-this.ACCELERATION);
            this.sprite.setDragX(0);
        } else if (cursors.right.isDown) {
            this.sprite.setAccelerationX(this.ACCELERATION);
            this.sprite.setDragX(0);
        } else {
            // No key held: zero acceleration, apply drag to decelerate
            this.sprite.setAccelerationX(0);
            this.sprite.setDragX(this.DRAG);
        }

        // --- Jumping ---
        // Jump only on key-press (not hold). Must release Up and press again for a new jump.
        if (Phaser.Input.Keyboard.JustDown(cursors.up) && isGrounded) {
            this.sprite.setVelocityY(this.JUMP_VELOCITY);
        }

        // --- Animation Selection ---
        this._updateAnimation(isGrounded);

        // --- Sprite Flipping ---
        // Face the direction of horizontal movement
        if (this.sprite.body.velocity.x < 0) {
            this.sprite.setFlip(true, false);
        } else if (this.sprite.body.velocity.x > 0) {
            this.sprite.setFlip(false, false);
        }
    }

    /**
     * Selects the appropriate animation based on player state.
     * @param {boolean} isGrounded
     */
    _updateAnimation(isGrounded) {
        if (!isGrounded) {
            this.sprite.play('jump', true);
        } else if (Math.abs(this.sprite.body.velocity.x) > 10) {
            this.sprite.play('walk', true);
        } else {
            this.sprite.play('idle', true);
        }
    }

    /**
     * Called when the player touches a monster.
     * Handles damage, knockback, invincibility, and death.
     * @param {number} monsterX - The monster's X position (for knockback direction)
     * @param {Function} onDeath - Callback if the player dies
     */
    damage(monsterX, onDeath) {
        if (this.isInvincible || !this.isAlive) return;

        this.health--;

        if (this.health <= 0) {
            // Player dies
            this.isAlive = false;
            this.sprite.setTint(0xff3333);
            if (onDeath) onDeath();
        } else {
            // Player survives: apply knockback and start invincibility
            // Knockback: 200 px/s away from monster, -200 px/s upward
            const knockDir = this.sprite.x < monsterX ? -1 : 1;
            this.sprite.setVelocityX(200 * knockDir);
            this.sprite.setVelocityY(-200);

            this._startInvincibility();
        }
    }

    /** Starts the 3-second invincibility period with blinking effect */
    _startInvincibility() {
        this.isInvincible = true;

        // Blink visibility every 150ms for the invincibility duration
        this.blinkTimer = this.scene.time.addEvent({
            delay: 150,
            loop: true,
            callback: () => {
                if (this.sprite && this.sprite.active) {
                    this.sprite.visible = !this.sprite.visible;
                }
            }
        });

        // End invincibility after 3 seconds
        this.invincibleTimer = this.scene.time.delayedCall(3000, () => {
            this.isInvincible = false;
            if (this.blinkTimer) this.blinkTimer.remove();
            if (this.sprite && this.sprite.active) this.sprite.setVisible(true);
        });
    }

    /**
     * Permanently upgrades jump velocity (called every 10 coins).
     * @returns {object} { oldVel, newVel } absolute values for HUD display
     */
    upgradeJump() {
        const oldVel = Math.abs(this.JUMP_VELOCITY);
        this.JUMP_VELOCITY += this.JUMP_UPGRADE_INCREMENT;
        const newVel = Math.abs(this.JUMP_VELOCITY);
        return { oldVel, newVel };
    }

    /**
     * Instant kill from falling off the map.
     * @param {Function} onDeath - Callback if the player dies
     */
    fallDeath(onDeath) {
        if (!this.isAlive) return;
        this.isAlive = false;
        this.sprite.setVisible(false);
        this.sprite.body.setEnable(false);
        if (onDeath) onDeath();
    }

    /** Cleans up timers when the player is destroyed (scene shutdown) */
    destroy() {
        if (this.blinkTimer) this.blinkTimer.remove();
        if (this.invincibleTimer) this.invincibleTimer.remove();
    }
}
