import { Application, Assets, Sprite, Texture, BitmapText } from "pixi.js";
import { GlowFilter } from "pixi-filters";

// --- GLOBAL VARIABLES ---
const grid_spacing_x = 10;
const grid_spacing_y = 10;

const stars = []; // Store our stars
const boxes = new Map(); // Store our boxes and their information
const grid_elements = []; // Store the grid elements so we can clear them in between levels
let currentLevel = 0;

// --- LEVEL CONFIG ---
const levelSettings = [
    {
        grid_size_x: 4,
        grid_size_y: 4,
        time: 10,
        general: 0.5,
        normal: 1.0,
        floating: 0.0,
        sinking: 0.0,
        lonely: 0.0,
        quantum: 0.0
    },
    {
        grid_size_x: 5,
        grid_size_y: 5,
        time: 15,
        general: 0.6,
        normal: 0.8,
        floating: 0.2,
        sinking: 0.0,
        lonely: 0.0,
        quantum: 0.0
    },
    {
        grid_size_x: 6,
        grid_size_y: 6,
        time: 20,
        general: 0.7,
        normal: 0.6,
        floating: 0.2,
        sinking: 0.2,
        lonely: 0.0,
        quantum: 0.0
    }
    // Add more levels as needed
];

// --- GLOBAL ASSETS ---
// Load textures
const starTexture = await Assets.load("/assets/star.png");
const boxTexture = await Assets.load("/assets/boxes/box_1.png");

// Load fonts
await Assets.load('/assets/fonts/alagard.ttf');

// --- LEVEL GENERATION ---
function generateLevel(app, level, timerText, background) {
    // Clear previous level
    boxes.forEach((_, box) => app.stage.removeChild(box))
    boxes.clear();

    for (let element of grid_elements) app.stage.removeChild(element);
    grid_elements.length = 0;

    // Load settings for the current level
    let currentLevelSettings = levelSettings[level];

    const grid_offset_x = (
        window.innerWidth / 2 - background.width / 2 + background.width / (2 * currentLevelSettings.grid_size_x + 4) -
        grid_spacing_x * currentLevelSettings.grid_size_x / 2
    );
    const grid_offset_y = (
        window.innerHeight / 2 - background.height / 2 + background.height / (2 * currentLevelSettings.grid_size_y + 4) -
        grid_spacing_y * currentLevelSettings.grid_size_y / 2
    );
    for (let i = 1; i < currentLevelSettings.grid_size_x + 1; i++) {
        for (let j = 1; j < currentLevelSettings.grid_size_y + 1; j++) {
            const placeholder_grid_element = new Sprite(Texture.WHITE);
            placeholder_grid_element.tint = 0x333333;
            placeholder_grid_element.width = background.width / (currentLevelSettings.grid_size_x + 2);
            placeholder_grid_element.height = background.height / (currentLevelSettings.grid_size_y + 2);
            placeholder_grid_element.anchor.set(0.5);
            placeholder_grid_element.position.set(grid_offset_x + i * (background.width / (currentLevelSettings.grid_size_x + 2) + grid_spacing_x),
                grid_offset_y + j * (background.height / (currentLevelSettings.grid_size_y + 2) + grid_spacing_y));
            app.stage.addChild(placeholder_grid_element);

            grid_elements.push(placeholder_grid_element);
        }
    }

    app.stage.eventMode = 'static';
    app.stage.hitArea = app.screen;
    app.stage.on('pointerup', onDragEnd);
    app.stage.on('pointerupoutside', onDragEnd);

    // Dragging functions
    let dragTarget = null;
    function onDragMove(event) {
        if (!dragTarget) return; // Nothing to do

        dragTarget.parent.toLocal(event.global, null, dragTarget.position);
        let x = window.innerWidth / 2 - background.getBounds().width / 2 + background.width / (2 * currentLevelSettings.grid_size_x + 4);
        let y = window.innerHeight / 2 - background.getBounds().height / 2 + background.height / (2 * currentLevelSettings.grid_size_x + 4);
        if (dragTarget.position.x < x) dragTarget.position.x = x;
        else if (dragTarget.position.x > window.innerWidth - x) dragTarget.position.x = window.innerWidth - x;
        if (dragTarget.position.y < y) dragTarget.position.y = y;
        else if (dragTarget.position.y > window.innerHeight - y) dragTarget.position.y = window.innerHeight - y;
    }

    function onDragStart() {
        this.alpha = 0.7;
        dragTarget = this;
        app.stage.setChildIndex(this, app.stage.children.length - 1);
        app.stage.on('pointermove', onDragMove);
    }

    function inCell(box, cell) {
        return (
            (2 * currentLevelSettings.grid_size_x + 4) * Math.abs(box.position.x - cell.position.x) < background.width &&
            (2 * currentLevelSettings.grid_size_y + 4) * Math.abs(box.position.y - cell.position.y) < background.height
        )
    }

    function onDragEnd() {
        if (!dragTarget) return; // Nothing to do

        app.stage.off('pointermove', onDragMove);
        dragTarget.alpha = 1;
        let grid_elements_x = grid_elements.filter(element => (
            (2 * currentLevelSettings.grid_size_x + 4) * Math.abs(element.position.x - dragTarget.position.x) < background.width
        ));
        for (let i = 0; i < grid_elements_x.length; i++) {
            if (!inCell(dragTarget, grid_elements_x[i])) continue;

            for (let [box, _] of boxes) {
                if (box === dragTarget) continue;
                if (inCell(box, grid_elements_x[i])) return;
            }
            dragTarget.position.set(grid_elements_x[i].position.x, grid_elements_x[i].position.y);
            boxes.get(dragTarget).x = dragTarget.position.x;
            boxes.get(dragTarget).y = dragTarget.position.y;
            break;
        } dragTarget = null;
    }

    function addBox(x, y, type = "normal") {
        const box = new Sprite(boxTexture);
        box.width = background.width / (currentLevelSettings.grid_size_x + 2);
        box.height = background.height / (currentLevelSettings.grid_size_y + 2);
        box.cursor = "pointer";
        box.eventMode = "static";
        if (type === "floating") box.tint = 0xaa0000;
        else if (type === "lonely") box.tint = 0x101010;
        else if (type === "sinking") box.tint = 0x00aa00;
        else if (type === "quantum") box.tint = 0x0000aa;
        box.on('pointerdown', onDragStart, box);

        box.anchor.set(0.5);
        box.position.set(x, y);
        app.stage.addChild(box);
        boxes.set(box, { x: x, y: y, type: type });
    }

    for (let i = 1; i < currentLevelSettings.grid_size_x + 1; i++) {
        for (let j = 1; j < currentLevelSettings.grid_size_y + 1; j++) {
            if (Math.random() > currentLevelSettings.general) continue;
            let boxType = "normal";
            let random = Math.random();
            if (random < currentLevelSettings.normal) boxType = "normal";
            else if (random < currentLevelSettings.normal + currentLevelSettings.floating) boxType = "floating";
            else if (random < currentLevelSettings.normal + currentLevelSettings.floating + currentLevelSettings.lonely) boxType = "lonely";
            else if (random < currentLevelSettings.normal + currentLevelSettings.floating + currentLevelSettings.lonely + currentLevelSettings.sinking) boxType = "sinking";
            else if (random < currentLevelSettings.normal + currentLevelSettings.floating + currentLevelSettings.lonely + currentLevelSettings.sinking + currentLevelSettings.quantum) boxType = "quantum";
            addBox(grid_offset_x + i * (background.width / (currentLevelSettings.grid_size_x + 2) + grid_spacing_x),
                grid_offset_y + j * (background.height / (currentLevelSettings.grid_size_y + 2) + grid_spacing_y),
                boxType);
        }
    }

    // Filter boxes by type
    const floatingBoxes = Array.from(boxes).filter(([_, box_data]) => box_data.type === "floating");
    const lonelyBoxes = Array.from(boxes).filter(([_, box_data]) => box_data.type === "lonely");
    const sinkingBoxes = Array.from(boxes).filter(([_, box_data]) => box_data.type === "sinking");
    const quantumBoxes = Array.from(boxes).filter(([_, box_data]) => box_data.type === "quantum");

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
        return (
            box1.y < box2.y + background.height / (currentLevelSettings.grid_size_x + 2) + margin_y &&
            box1.y + background.height / (currentLevelSettings.grid_size_y + 2) + margin_y > box2.y
        );
    }

    // Main game loop
    let timer = levelSettings[level].time;
    let lonelyCounter = 0;
    const gameLoop = (delta) => {
        for (let [box, box_data] of floatingBoxes) {
            if (box === dragTarget) continue;

            if (box.position.y <= grid_offset_y + box.height + grid_spacing_y) {
                box_data.y = box.position.y;
                continue;
            }

            const originalY = box.position.y;
            box.position.y -= delta.deltaMS / 100;

            let boxes_x = Array.from(boxes).filter(([otherBox, otherBox_data]) =>
                (box.x === otherBox.x || box_data.x === otherBox_data.x) && box !== otherBox && otherBox !== dragTarget
            );

            for (let [otherBox, otherBox_data] of boxes_x) {
                if (checkCollision(box,
                    otherBox_data.type === "lonely" ? otherBox_data : otherBox,
                    otherBox_data.type === "sinking" ? 0 : grid_spacing_y)) {
                    box.position.y = originalY;
                    box_data.y = originalY;
                    break;
                }
            }
        }

        for (let [box, box_data] of sinkingBoxes) {
            if (box === dragTarget) continue;

            if (box.position.y >= window.innerHeight - grid_offset_y - box.height) continue;

            const originalY = box.position.y;
            box.position.y += delta.deltaMS / 100;

            let boxes_x = Array.from(boxes).filter(([otherBox, otherBox_data]) =>
                (box.x === otherBox.x || box_data.x === otherBox_data.x) && box !== otherBox && otherBox !== dragTarget
            );

            for (let [otherBox, otherBox_data] of boxes_x) {
                if (checkCollision(box,
                    otherBox_data.type === "lonely" ? otherBox_data : otherBox)) {
                    box.position.y = originalY;
                    box_data.y = originalY;
                    break;
                }
            }
        }

        for (let [box, box_data] of lonelyBoxes) {
            if (box === dragTarget) continue;

            let neighbours = 0;
            for (let [otherBox, otherBox_data] of lonelyBoxes) {
                if (otherBox === box) continue;
                if (otherBox_data.x === box_data.x || otherBox_data.y === box_data.y) neighbours++;
            }

            lonelyCounter++;
            if (lonelyCounter % 5 === 0 || neighbours === 2) {
                box.position.x = box_data.x;
                box.position.y = box_data.y;
                continue;
            }
            box.position.x += Math.random() * 2 - 1;
            box.position.y += Math.random() * 2 - 1;
        }

        if (quantumBoxes.length > 0 && // Are there any quantum boxes to move?
            timer > 3 && // Don't move the quantum box near the end of the level
            Math.random() < (timer - 3) / 1000 && // Randomly move the quantum box, decreasing the chance as time goes on
            (quantumBoxes.length !== 1 || quantumBoxes[0][0] !== dragTarget)) { // Make sure we're not dragging the quantum box we chose
            let randomBox = quantumBoxes[Math.floor(Math.random() * quantumBoxes.length)];
            while (randomBox === dragTarget) { // Don't use the one we're dragging
                randomBox = quantumBoxes[Math.floor(Math.random() * quantumBoxes.length)];
            }
            randomBox[0].position.set(
                grid_offset_x + (Math.random() * currentLevelSettings.grid_size_x + 1) * (background.width / (currentLevelSettings.grid_size_x + 2) + grid_spacing_x),
                grid_offset_y + (Math.random() * currentLevelSettings.grid_size_y + 1) * (background.height / (currentLevelSettings.grid_size_y + 2) + grid_spacing_y)
            );
            randomBox[1].x = randomBox[0].position.x;
            randomBox[1].y = randomBox[0].position.y;
            app.stage.setChildIndex(randomBox[0], app.stage.children.length - 1);
        }

        // Delivery time!
        if (timer < 1) {
            app.ticker.remove(gameLoop);
            app.stage.eventMode = 'none';

            let won = true;
            for (let [box, box_data] of floatingBoxes) {
                if (box.position.y !== box_data.y) {
                    won = false;
                    break;
                }

                if (box.position.y <= grid_offset_y + box.height + grid_spacing_y) {
                    won = false;
                    break;
                }

                let canContinue = false;
                for (let [otherBox, _] of boxes) {
                    if (otherBox === box) continue;
                    if (box.x !== otherBox.x) continue;
                    if (box.y + background.height / (currentLevelSettings.grid_size_y + 2) + grid_spacing_y > otherBox.y) {
                        canContinue = true;
                        break;
                    }
                } if (canContinue) continue;

                won = false;
                break;
            }

            for (let [box, box_data] of sinkingBoxes) {
                if (box.position.y === box_data.y) continue;
                won = false;
                break;
            }

            for (let [box, box_data] of lonelyBoxes) {
                if (box.position.y !== box_data.y) {
                    won = false;
                    break;
                }

                let neighbours = 0;
                for (let [otherBox, otherBox_data] of lonelyBoxes) {
                    if (otherBox === box) continue;
                    if (otherBox_data.x === box_data.x || otherBox_data.y === box_data.y) neighbours++;
                }

                if (neighbours !== 2) {
                    won = false;
                    break;
                }
            }

            for (let [box, box_data] of boxes) {
                if (box.position.y === box_data.y) continue;
                won = false;
                break;
            }

            if (won) {
                if (currentLevel < levelSettings.length - 1) {
                    currentLevel++;
                    setTimeout(() => generateLevel(app, currentLevel, timerText, background), 1500);
                } else alert("Congratulations! You've completed all levels!");
            } else {
                alert("You lost! Try again.");
                // Reset to the start
                currentLevel = 0;
                setTimeout(() => generateLevel(app, currentLevel, timerText, background), 1500);
            }
        }
        timer -= delta.deltaMS / 1000;
        timerText.text = "00:" + (timer < 10 ? "0" : "") + Math.floor(timer);
    };

    app.ticker.add(gameLoop);
}

// --- PIXIJS APP ---
(async () => {
    const app = new Application();
    await app.init({ background: "#111111", resizeTo: window });
    document.getElementById("pixi-container").appendChild(app.canvas);

    function createStar(x, y, size, color) {
        const star = new Sprite(starTexture);
        star.tint = color;
        if (size < 1) size = 1;
        star.width = size;
        star.height = size;
        star.anchor.set(0.5);
        star.position.set(x, y);
        star.alpha = Math.random();
        if (star.alpha < 0.5) star.alpha = 0.5;
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
    });

    // Timer text
    const timerText = new BitmapText({
        text: '',
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

    generateLevel(app, currentLevel, timerText, background);
})();