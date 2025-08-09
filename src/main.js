import {Application, Assets, Sprite, Texture} from "pixi.js";
import { GlowFilter } from "pixi-filters";

// Global variables
const grid_spacing_x = 10;
const grid_spacing_y = 10;

// Variables needed all throughout the application
const boxes = new Map();

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
    background.width = Math.min(app.screen.height, app.screen.width) - 100;
    background.height = Math.min(app.screen.height, app.screen.width) - 100;
    background.anchor.set(0.5);
    background.position.set(app.screen.width / 2, app.screen.height / 2);
    background.tint = 0xc0c0c0;
    background.opacity = 0.5;
    app.stage.addChild(background);

    const grid_offset_x = window.innerWidth / 2 - background.width / 2 + background.width / 20 - grid_spacing_x * 4;
    const grid_offset_y = window.innerHeight / 2 - background.height / 2 + background.height / 20 - grid_spacing_y * 4;
    let grid_elements = [];
    for (let i = 1; i < 9; i++) {
        for (let j = 1; j < 9; j++) {
            const placeholder_grid_element = new Sprite(Texture.WHITE);
            placeholder_grid_element.tint = 0x333333;
            placeholder_grid_element.width = background.width / 10;
            placeholder_grid_element.height = background.height / 10;
            placeholder_grid_element.anchor.set(0.5);
            placeholder_grid_element.position.set(grid_offset_x + i * (background.width / 10 + grid_spacing_x), grid_offset_y + j * (background.height / 10 + grid_spacing_y));
            app.stage.addChild(placeholder_grid_element);

            grid_elements.push(placeholder_grid_element);
        }
    }

    let dragTarget = null;

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerup', onDragEnd);
    app.stage.on('pointerupoutside', onDragEnd);

    function onDragMove(event) {
        if (dragTarget) {
            dragTarget.parent.toLocal(event.global, null, dragTarget.position);

            let x = window.innerWidth / 2 - background.getBounds().width / 2 + background.width / 20;
            let y = window.innerHeight / 2 - background.getBounds().height / 2 + background.height / 20;

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
        this.alpha = 0.7;
        dragTarget = this;
        app.stage.on('pointermove', onDragMove);
    }

    function onDragEnd() {
        if (dragTarget) {
            app.stage.off('pointermove', onDragMove);
            dragTarget.alpha = 1;

            const grid_margin_x = background.width / 20;
            const grid_margin_y = background.height / 20;
            // TODO: Find more efficient way to do this
            for (let i = 0; i < grid_elements.length; i++) {
                // Check if the dragTarget is within grid_margin pixels of the grid_element
                if (Math.abs(dragTarget.position.x - grid_elements[i].position.x) < grid_margin_x && Math.abs(dragTarget.position.y - grid_elements[i].position.y) < grid_margin_y) {
                    // Make it so two boxes can't be placed on top of each other
                    for (let [box, box_data] of boxes) {
                        if (box === dragTarget) continue;
                        if (box_data.type === "floating") continue;
                        if (Math.abs(box.position.x - grid_elements[i].position.x) < grid_margin_x && Math.abs(box.position.y - grid_elements[i].position.y) < grid_margin_y) {
                            return;
                        }
                    }
                    dragTarget.position.set(grid_elements[i].position.x, grid_elements[i].position.y);
                }
            }

            dragTarget = null;
        }
    }

    function addBox(x, y, type = "normal") {
        // Create a box Sprite
        const box = new Sprite(boxTexture);
        box.width = background.width / 10;
        box.height = background.height / 10;
        box.cursor = "pointer";
        box.eventMode = "static";
        box.on('pointerdown', onDragStart, box);

        // Center the sprite's anchor point
        box.anchor.set(0.5);

        // Move the sprite to the center of the screen
        box.position.set(x, y);

        // Add the box to the stage
        app.stage.addChild(box);

        // Add the box to the boxes array
        boxes.set(box, { x: x, y: y, type: type });
    }

    for (let i = 1; i < 9; i++) {
        for (let j = 1; j < 9; j++) {
            if (Math.random() < 0.5) continue;
            addBox(grid_offset_x + i * (background.width / 10 + grid_spacing_x), grid_offset_y + j * (background.height / 10 + grid_spacing_y));
        }
    }

    /*
    addBox(grid_offset_x + 3 * (background.width / 10 + grid_spacing_x), grid_offset_y + 8 * (background.height / 10 + grid_spacing_y), "floating");

    app.ticker.add((delta) => {
        for (let [box, box_data] of boxes) {
            if (box_data.type === "floating") {
                if (dragTarget && dragTarget.parent === box.parent) continue;
                if (box.position.y > window.innerHeight / 2 - background.height / 2 + background.height / 10 + grid_spacing_y) {
                    box.position.y -= 1;
                }
            }
        }
    })
    */
})();
