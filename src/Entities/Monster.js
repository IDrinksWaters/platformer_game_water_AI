/**
 * Monster Class
 * Handles monster patrol AI: constant horizontal movement,
 * wall reversal, and edge detection to prevent falling off platforms.
 */
class Monster {
    /**
     * @param {Phaser.Scene} scene - The scene this monster belongs to
     * @param {number} x - Spawn X position (world coordinates)
     * @param {number} y - Spawn Y position (world coordinates)
     * @param {number} direction - Initial horizontal direction (-1 = left, 1 = right)
     * @param {Phaser.Tilemaps.TilemapLayer} groundLayer - The collision layer for edge detection
     */
    constructor(scene, x, y, direction, groundLayer) {
        this.scene = scene;
        this.groundLayer = groundLayer;

        // Patrol parameters from DESIGN.md
        this.PATROL_SPEED = 60;
        this.direction = direction;

        // Create the sprite and physics body
        this._createSprite(x, y);
        this._createAnimation();
    }

    /** Creates the monster sprite and configures its physics body */
    _createSprite(x, y) {
        // Frame 340 = monster idle from the transparent sprite sheet
        this.sprite = this.scene.physics.add.sprite(x, y, 'tilemap_sheet', 340);

        // Monsters don't bounce off surfaces
        this.sprite.setBounce(0);

        // Keep monster within the physics world bounds
        this.sprite.setCollideWorldBounds(true);

        // Set initial patrol velocity
        this.sprite.setVelocityX(this.PATROL_SPEED * this.direction);
    }

    /** Defines the monster walk animation (idempotent — only creates once) */
    _createAnimation() {
        if (!this.scene.anims.exists('monsterWalk')) {
            this.scene.anims.create({
                key: 'monsterWalk',
                // Walk frames 341 → 342, 6fps, looping
                frames: [
                    { key: 'tilemap_sheet', frame: 341 },
                    { key: 'tilemap_sheet', frame: 342 }
                ],
                frameRate: 6,
                repeat: -1
            });
        }

        this.sprite.play('monsterWalk');
    }

    /**
     * Per-frame update: handles patrol movement, wall reversal,
     * edge detection, and sprite flipping.
     */
    update() {
        if (!this.sprite || !this.sprite.active) return;

        const body = this.sprite.body;

        // --- Wall Reversal ---
        // If blocked on the left side, reverse to walk right
        if (body.blocked.left) {
            this.direction = 1;
            this.sprite.setVelocityX(this.PATROL_SPEED * this.direction);
        }
        // If blocked on the right side, reverse to walk left
        else if (body.blocked.right) {
            this.direction = -1;
            this.sprite.setVelocityX(this.PATROL_SPEED * this.direction);
        }

        // --- Edge Detection ---
        // When grounded, check 10px ahead in the direction of movement
        // for a solid tile below the monster's feet. If none found, reverse.
        if (body.blocked.down) {
            // Position 10px forward from the monster's center
            const forwardX = this.sprite.x + (10 * this.direction);
            // Just below the monster's bottom edge
            const checkY = this.sprite.y + (this.sprite.height / 2) + 2;

            // Query the tile at the forward position, one row below the monster
            const tile = this.groundLayer.getTileAtWorldXY(forwardX, checkY);
            if (!tile || !tile.properties.collides) {
                // No ground ahead: reverse direction to avoid falling off
                this.direction *= -1;
                this.sprite.setVelocityX(this.PATROL_SPEED * this.direction);
            }
        }

        // --- Sprite Flipping ---
        // Face the direction of movement
        this.sprite.setFlip(this.direction < 0, false);
    }
}
