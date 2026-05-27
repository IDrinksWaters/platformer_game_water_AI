/**
 * WaterCup Class
 * Manages the water cup: starts invisible/disabled, plays a dramatic
 * activation sequence when all coins are collected, then becomes
 * collectible for the win condition.
 */
class WaterCup {
    /**
     * @param {Phaser.Scene} scene - The scene this cup belongs to
     * @param {number} x - Spawn X position (where cup appears on activation)
     * @param {number} y - Spawn Y position
     * @param {Phaser.Tilemaps.TilemapLayer} groundLayer - Collision layer for cup physics
     */
    constructor(scene, x, y, groundLayer) {
        this.scene = scene;
        this.groundLayer = groundLayer;
        this.spawnX = x;
        this.spawnY = y;

        // Cup starts inactive and invisible
        this.isActive = false;
        this.isActivating = false;

        // Win flag: prevents the win trigger from firing more than once
        this.winTriggered = false;

        // Create the sprite
        this._createSprite();
    }

    /** Creates the water cup sprite — initially invisible with physics disabled */
    _createSprite() {
        // Frame 52 = water cup from the transparent sprite sheet
        this.sprite = this.scene.physics.add.sprite(this.spawnX, this.spawnY, 'tilemap_sheet', 52);

        // Initially invisible and disabled
        this.sprite.setVisible(false);
        this.sprite.body.setEnable(false);

        // Cup collides with the ground layer so it lands on surfaces
        this.scene.physics.add.collider(this.sprite, this.groundLayer);
    }

    /**
     * Begins the 3-second dramatic activation sequence:
     * 1. Lock player controls, zero velocity
     * 2. Pause background music
     * 3. Play water_unlock sound at 0.9 volume
     * 4. Camera shake for 3 seconds
     * 5. After 3s: unlock controls, resume BGM, show cup, particle burst
     * @param {Player} player - The player object (for locking controls)
     * @param {Function} onActivated - Callback after activation completes
     */
    activate(player, onActivated) {
        if (this.isActivating) return;
        this.isActivating = true;

        const camera = this.scene.cameras.main;

        // 1. Lock player controls
        player.controlsLocked = true;
        player.sprite.setAccelerationX(0);
        player.sprite.setVelocityX(0);

        // 2. Pause background music
        const bgm = this.scene.sound.get('ingame_bgm');
        if (bgm && bgm.isPlaying) {
            bgm.pause();
        }

        // 3. Play the water_unlock stinger
        this.scene.sound.play('water_unlock', { volume: 0.9 });

        // 4. Shake the camera for 3 seconds
        camera.shake(3000, 0.01);

        // 5. After 3 seconds, complete the activation
        this.scene.time.delayedCall(3000, () => {
            // Unlock player controls
            player.controlsLocked = false;

            // Resume background music
            if (bgm && bgm.isPaused) {
                bgm.resume();
            }

            // Make the water cup visible and enable its physics
            this.sprite.setVisible(true);
            this.sprite.body.setEnable(true);
            this.isActive = true;

            // Particle burst at the cup's spawn location
            if (onActivated) onActivated(this.sprite.x, this.sprite.y);

            this.isActivating = false;
        });
    }

    /**
     * Called when the player overlaps the water cup.
     * Triggers the win state (only fires once).
     * @param {Function} onWin - Callback to trigger the win screen
     */
    collect(onWin) {
        if (!this.isActive || this.winTriggered) return;
        this.winTriggered = true;

        if (onWin) onWin();
    }
}
