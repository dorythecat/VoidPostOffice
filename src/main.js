import {Application, Assets, Sprite, Texture} from "pixi.js";
import { GlowFilter } from "pixi-filters";

(async () => {
    // Create a new application
    const app = new Application();

    // Initialize the application
    await app.init({ background: "#111111", resizeTo: window });

    // Append the application canvas to the document body
    document.getElementById("pixi-container").appendChild(app.canvas);

    // Load textures
    const starTexture = await Assets.load("/assets/star.png");
    const boxTexture = await Assets.load("/assets/boxes/box_1.png");

    function createStar(x, y, size, color) {
        const star = new Sprite(starTexture);
        star.tint = color;
        star.width = size;
        star.height = size;
        star.position.set(x, y);
        return star;
    }

    for (let i = 0; i < 500; i++) {
        const star = createStar(Math.random() * app.screen.width, Math.random() * app.screen.height, Math.random() * 10, Math.random() * 0xffffff);
        star.alpha = Math.random();
        star.filters = [
            new GlowFilter({ distance: 15, outerStrength: 2, color: star.tint })
        ]
        app.stage.addChild(star);
    }

    const background = new Sprite(Texture.WHITE);
    background.width = app.screen.height - 100;
    background.height = app.screen.height - 100;
    background.anchor.set(0.5);
    background.position.set(app.screen.width / 2, app.screen.height / 2);
    background.tint = 0xc0c0c0;
    background.opacity = 0.5;
    app.stage.addChild(background);

    // Create a box Sprite
    const box = new Sprite(boxTexture);
    box.scale.set(3);
    box.cursor = "pointer";
    box.eventMode = "static";
    box.on('pointerdown', onDragStart, box);

    let dragTarget = null;

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerup', onDragEnd);
    app.stage.on('pointerupoutside', onDragEnd);

    function onDragMove(event) {
        if (dragTarget) {
            dragTarget.parent.toLocal(event.global, null, dragTarget.position);

            let x = window.innerWidth / 2 - background.getBounds().width / 2 + box.width / 2;
            let y = window.innerHeight / 2 - background.getBounds().height / 2 + box.height / 2;

            if (dragTarget.position.x < x) dragTarget.position.x = x;
            else if (dragTarget.position.x > window.innerWidth - x) dragTarget.position.x = window.innerWidth - x;

            if (dragTarget.position.y < y) dragTarget.position.y = y;
            else if (dragTarget.position.y > window.innerHeight - y) dragTarget.position.y = window.innerHeight - y;
        }
    }

    function onDragStart() {
        // Store a reference to the data
        // * The reason for this is because of multitouch *
        // * We want to track the movement of this particular touch *
        this.alpha = 0.5;
        dragTarget = this;
        app.stage.on('pointermove', onDragMove);
    }

    function onDragEnd() {
        if (dragTarget) {
            app.stage.off('pointermove', onDragMove);
            dragTarget.alpha = 1;
            dragTarget = null;
        }
    }

    // Center the sprite's anchor point
    box.anchor.set(0.5);

    // Move the sprite to the center of the screen
    box.position.set(app.screen.width / 2, app.screen.height / 2);

    // Add the box to the stage
    app.stage.addChild(box);
})();
