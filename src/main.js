import { Application, Assets, Sprite } from "pixi.js";

(async () => {
    // Create a new application
    const app = new Application();

    // Initialize the application
    await app.init({ background: "#111111", resizeTo: window });

    // Append the application canvas to the document body
    document.getElementById("pixi-container").appendChild(app.canvas);

    // Load the bunny texture
    const texture = await Assets.load("/assets/boxes/box_1.png");

    // Create a box Sprite
    const box = new Sprite(texture);
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

    // Add the bunny to the stage
    app.stage.addChild(box);
})();
