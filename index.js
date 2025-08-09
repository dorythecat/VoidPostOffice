const canvas = document.getElementById('canvas');

let gl = canvas.getContext('webgl');
if (!gl) {
    alert('WebGL not supported! Aborting!');
}

// Resize the canvas to fill the browser window dynamically
function resizeCanvasToDisplaySize(canvas) {
    // Lookup the size the browser is displaying the canvas in CSS pixels.
    const displayWidth  = canvas.clientWidth;
    const displayHeight = canvas.clientHeight;

    // Check if the canvas is not the same size.
    const needResize = canvas.width  !== displayWidth ||
        canvas.height !== displayHeight;

    if (needResize) {
        // Make the canvas the same size
        canvas.width  = displayWidth;
        canvas.height = displayHeight;
    }

    return needResize;
}

window.addEventListener('resize', () => {
    resizeCanvasToDisplaySize(gl.canvas);
});

// Create a shader program
function createShader(gl, type, source) {
    let shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    let success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (success) return shader;

    console.log(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
}

const vertexShaderSource = document.querySelector("#vertex-shader-2d").text;
const fragmentShaderSource = document.querySelector("#fragment-shader-2d").text;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);


// Create a program
function createProgram(gl, vertexShader, fragmentShader) {
    let program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    let success = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (success) return program;

    console.log(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

const program = createProgram(gl, vertexShader, fragmentShader);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
const resolutionUniformLocation = gl.getUniformLocation(program, "u_resolution");
const colorUniformLocation = gl.getUniformLocation(program, "u_color");

const positionBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

function makeSquare(x, y, width, height) {
    return [
        x, y,
        x + width, y,
        x, y + height,
        x + width, y + height,
    ];
}

positions = makeSquare(0, 0, 100, 100);

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

// Clear the canvas
gl.clearColor(0, 0, 0, 0);
gl.clear(gl.COLOR_BUFFER_BIT);

// Tell it to use our program (pair of shaders)
gl.useProgram(program);

gl.enableVertexAttribArray(positionAttributeLocation);

// set the resolution
gl.uniform2f(resolutionUniformLocation, gl.canvas.width, gl.canvas.height);
gl.uniform4f(colorUniformLocation, 1, 0, 0, 1);



// Bind the position buffer.
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

// Tell the attribute how to get data out of positionBuffer (ARRAY_BUFFER)
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0)

// Draw the scene
gl.drawArrays(gl.TRIANGLE_STRIP, 0, positions.length / 2);