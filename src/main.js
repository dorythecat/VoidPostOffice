import { Application, Assets, Sprite, Texture, BitmapText } from "pixi.js";
import { GlowFilter } from "pixi-filters";

// Global variables
const grid_spacing_x = 10;
const grid_spacing_y = 10;

// Variables needed all throughout the application
const stars = []; // Store our stars
const boxes = new Map(); // Store our boxes and their information

let level = 0; // What level are we playing right now?

const levelChances = [
    {
        general: 0.5, // Chance of a box being placed in any cell at all
        normal: 1.0,
        floating: 0.0,
        lonely: 0.0,
        sinking: 0.0,
        quantum: 0.0
    }
];

// Actual game logic
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

    // Load fonts
    await Assets.load('/assets/fonts/alagard.ttf');

    function createStar(x, y, size, color) {
        const star = new Sprite(starTexture);
        star.tint = color;
        if (size < 1) size = 1;
        star.width = size;
        star.height = size;
        star.anchor.set(0.5);
        star.position.set(x, y);
        star.alpha = Math.random();
        if (star.alpha < 0.5) star.alpha = 0.5; // Ensure the star is visible
        star.filters = [
            new GlowFilter({ distance: 15, outerStrength: 2, color: star.tint })
        ]
        stars.push(star);
        app.stage.addChild(star);
    }

    for (let i = 0; i < 500; i++) {
        createStar(Math.random() * app.screen.width,
                   Math.random() * app.screen.height,
                 Math.random() * 10,
                Math.random() * 0xffffff);
    }

    // Add timer text
    const timerText = new BitmapText({
        text: '01:00',
        style: {
            fontFamily: 'alagard',
            fontSize: 64,
            fill: '#c0c0c0',
            stroke: {
                color: '#eeeeee',
                width: 2
            }
        }
    });

    timerText.anchor.set(0.5);
    timerText.position.set(app.screen.width / 5, app.screen.height / 7);
    app.stage.addChild(timerText);

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
            placeholder_grid_element.position.set(grid_offset_x + i * (background.width / 10 + grid_spacing_x),
                                                  grid_offset_y + j * (background.height / 10 + grid_spacing_y));
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
        app.stage.setChildIndex(this, app.stage.children.length - 1); // Make sure the dragged sprite is on top of everything else
        app.stage.on('pointermove', onDragMove);
    }

    function inCell(box, cell) {
        return (
            20 * Math.abs(box.position.x - cell.position.x) < background.width &&
            20 * Math.abs(box.position.y - cell.position.y) < background.height
        )
    }

    function onDragEnd() {
        if (dragTarget) {
            app.stage.off('pointermove', onDragMove);
            dragTarget.alpha = 1;

            // Get all the grid elements in the same column as the dragTarget
            let grid_elements_x = grid_elements.filter(element => (
                20 * Math.abs(element.position.x - dragTarget.position.x) < background.width
            ));
            for (let i = 0; i < grid_elements_x.length; i++) {
                // Check if the dragTarget is within grid_margin pixels of the grid_element
                if (inCell(dragTarget, grid_elements_x[i])) {
                    // Make it so two boxes can't be placed on top of each other
                    for (let [box, _] of boxes) {
                        if (box === dragTarget) continue;
                        if (inCell(box, grid_elements_x[i])) return;
                    }
                    dragTarget.position.set(grid_elements_x[i].position.x, grid_elements_x[i].position.y);
                    boxes.get(dragTarget).x = dragTarget.position.x;
                    boxes.get(dragTarget).y = dragTarget.position.y;
                    break;
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
        if (type === "floating") box.tint = 0xaa0000;
        else if (type === "lonely") box.tint = 0x101010;
        else if (type === "sinking") box.tint = 0x00aa00;
        else if (type === "quantum") box.tint = 0x0000aa;
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

    let levelChance = levelChances[level];
    for (let i = 1; i < 9; i++) {
        for (let j = 1; j < 9; j++) {
            if (Math.random() > levelChance.general) continue;
            let boxType = "";
            // TODO: Fix chances to actually be the ones that we put in the settings
            if (Math.random() < levelChance.normal) boxType = "normal";
            else if (Math.random() < levelChance.floating) boxType = "floating";
            else if (Math.random() < levelChance.sinking) boxType = "sinking";
            else if (Math.random() < levelChance.lonely) boxType = "lonely";
            else if (Math.random() < levelChance.quantum) boxType = "quantum";
            addBox(grid_offset_x + i * (background.width / 10 + grid_spacing_x),
                   grid_offset_y + j * (background.height / 10 + grid_spacing_y),
                 boxType);
        }
    }

    const floatingBoxes = Array.from(boxes).filter(([box, box_data]) =>
        box_data.type === "floating"
    );
    const lonelyBoxes = Array.from(boxes).filter(([box, box_data]) =>
        box_data.type === "lonely"
    );
    const sinkingBoxes = Array.from(boxes).filter(([box, box_data]) =>
        box_data.type === "sinking"
    );
    const quantumBoxes = Array.from(boxes).filter(([box, box_data]) =>
        box_data.type === "quantum"
    );

    while (lonelyBoxes.length % 3 !== 0) {
        let randomBox = Math.floor(Math.random() * lonelyBoxes.length);
        app.stage.removeChild(lonelyBoxes[randomBox][0]);
        boxes.delete(lonelyBoxes[randomBox][0]);
        lonelyBoxes.splice(randomBox, 1);
    }

    while (sinkingBoxes.length > 8) {
        let randomBox = Math.floor(Math.random() * sinkingBoxes.length);
        app.stage.removeChild(sinkingBoxes[randomBox][0]);
        boxes.delete(sinkingBoxes[randomBox][0]);
        sinkingBoxes.splice(randomBox, 1);
    }

    function checkCollision(box1, box2, margin_y = 0) {
        return ( // We only check the y dimensions because the x dimensions should be checked by the preceding code
            box1.y < box2.y + background.height / 10 + margin_y &&
            box1.y + background.height / 10 + margin_y > box2.y
        );
    }

    // Star movement
    const starSpeedX = Math.random() * 2 - 1;
    const starSpeedY = Math.random() * 2 - 1;
    const speedFactor = Math.random() * 100;
    app.ticker.add((delta) => {
        for (let star of stars) {
            star.position.x += starSpeedX * delta.deltaMS / speedFactor;
            star.position.y += starSpeedY * delta.deltaMS / speedFactor;
            if (Math.random() < 0.01) star.alpha = Math.random();
            if (star.alpha < 0.5) star.alpha = 0.5;

            if (star.position.x < -star.width) star.position.x = app.screen.width;
            else if (star.position.x > app.screen.width) star.position.x = -star.width;
            if (star.position.y < -star.height) star.position.y = app.screen.height;
            else if (star.position.y > app.screen.height) star.position.y = -star.height;
        }
    })


    // Main game loop
    let timer = 60;
    let lonelyCounter = 0;
    app.ticker.add((delta) => {
        for (let [box, box_data] of floatingBoxes) {
            if (box.position.y <= grid_offset_y + box.height + grid_spacing_y) {
                box_data.y = box.position.y;
                continue; // Skip if already at the top of the screen
            }

            const originalY = box.position.y;
            box.position.y -= delta.deltaMS / 100; // Move upward

            // Get all the boxes in the same column as this one
            let boxes_x = Array.from(boxes).filter(([otherBox, otherBox_data]) =>
                (box.x === otherBox.x || box_data.x === otherBox_data.x) && box !== otherBox
            );

            // Check for collisions
            for (let [otherBox, otherBox_data] of boxes_x) {
                if (checkCollision(box,
                    otherBox_data.type === "lonely" ? otherBox_data : otherBox, // Solves the edge case with lonely boxes
                    otherBox_data.type === "sinking" ? 0 : grid_spacing_y)) { // Remove spacing for sinking box collisions
                    // Revert position if collision detected
                    box.position.y = originalY;
                    box_data.y = originalY;
                    break;
                }
            }
        }

        for (let [box, box_data] of sinkingBoxes) {
            if (box.position.y >= window.innerHeight - grid_offset_y - box.height) {
                continue; // Skip if already at the top of the screen
            }

            const originalY = box.position.y;
            box.position.y += delta.deltaMS / 100; // Move upward

            // Get all the boxes in the same column as this one
            let boxes_x = Array.from(boxes).filter(([otherBox, otherBox_data]) =>
                (box.x === otherBox.x || box_data.x === otherBox_data.x) && box !== otherBox
            );

            // Check for collisions
            for (let [otherBox, otherBox_data] of boxes_x) {
                // Collisions don't have spacing, since sinking boxes shouldn't be put on top of other boxes
                if (checkCollision(box,
                    otherBox_data.type === "lonely" ? otherBox_data : otherBox)) {
                    // Revert position if collision detected
                    box.position.y = originalY;
                    box_data.y = originalY;
                    break;
                }
            }
        }

        // Make lonely boxes shake
        for (let [box, box_data] of lonelyBoxes) {
            if (box === dragTarget) continue;

            // Detect how many neighbours the lonely box has
            let neighbours = 0;
            for (let [otherBox, otherBox_data] of lonelyBoxes) {
                if (otherBox === box) continue;
                // Check if the other box is in the same column or row as the lonely box
                if (otherBox_data.x === box_data.x || otherBox_data.y === box_data.y) neighbours++;
            }

            lonelyCounter++;
            if (lonelyCounter % 5 === 0 || neighbours === 2) {
                // Reset position
                box.position.x = box_data.x;
                box.position.y = box_data.y;
                continue;
            }
            box.position.x += Math.random() * 2 - 1;
            box.position.y += Math.random() * 2 - 1;
        }

        // Quantum boxes
        if (quantumBoxes.length > 0) {
            if (timer > 3 && Math.random() < (timer - 3) / 1000) {
                let randomBox = quantumBoxes[Math.floor(Math.random() * quantumBoxes.length)];
                // Make sure we have an ungrabbed box or we'll fall into an infinite loop
                while (randomBox === dragTarget && quantumBoxes.length > 1) {
                    randomBox = quantumBoxes[Math.floor(Math.random() * quantumBoxes.length)];
                }
                randomBox[0].position.set(
                    grid_offset_x + (Math.random() * 8 + 1) * (background.width / 10 + grid_spacing_x),
                    grid_offset_y + (Math.random() * 8 + 1)  * (background.height / 10 + grid_spacing_y)
                );
                randomBox[1].x = randomBox[0].position.x;
                randomBox[1].y = randomBox[0].position.y;
                app.stage.setChildIndex(randomBox[0], app.stage.children.length - 1);
            }
        }

        // Delivery time!
        if (timer < 1) {
            app.ticker.stop();
            app.stage.eventMode = 'none';

            // Calculate if you won or lost
            let won = true;
            for (let [box, box_data] of floatingBoxes) {
                // Means the box is floating or grabbed, so it should immediately lose
                if (box.y !== box_data.y) {
                    won = false;
                    break;
                }

                // If the box is at the top of the grid, it should immediately lose
                if (box.position.y <= grid_offset_y + box.height + grid_spacing_y) {
                    won = false;
                    break;
                }

                // Check if the box is below another box
                let canContinue = false;
                for (let [otherBox, _] of boxes) {
                    if (otherBox === box) continue;
                    if (box.x !== otherBox.x) continue;
                    if (box.y + background.height / 10 + grid_spacing_y > otherBox.y) {
                        canContinue = true;
                        break;
                    }
                } if (canContinue) continue;

                won = false;
                break;
            }

            for (let [box, box_data] of lonelyBoxes) {
                // Means the box is grabbed, so it should immediately lose
                if (box.y !== box_data.y) {
                    won = false;
                    break;
                }

                // Detect how many neighbours the lonely box has
                let neighbours = 0;
                for (let [otherBox, otherBox_data] of lonelyBoxes) {
                    if (otherBox === box) continue;
                    // Check if the other box is in the same column or row as the lonely box
                    if (otherBox_data.x === box_data.x || otherBox_data.y === box_data.y) neighbours++;
                }

                if (neighbours !== 2) {
                    won = false;
                    break;
                }
            }

            // Check that no box is lifted from its place or outside the grid
            for (let [box, box_data] of boxes) {
                if (box.y === box_data.y) continue;
                won = false;
                break;
            }

            alert(won ? "You won!" : "You lost!");
        }
        timer -= delta.deltaMS / 1000;
        timerText.text = "00:" + (timer < 10 ? "0" : "") + Math.floor(timer);
    });
})();
