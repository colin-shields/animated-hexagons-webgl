
// SHADERS /////////////////////////////////////////////////////////////////////////////////////////////////////////////

// Vertex shader program
const VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'attribute vec4 a_Color;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_Position = a_Position;\n' +
    '  gl_PointSize = 10.0;\n' +
    '  v_Color = a_Color;\n' +
    '}\n';

// Fragment shader program
const FSHADER_SOURCE =
    'precision mediump float;\n' +
    'varying vec4 v_Color;\n' +
    'void main() {\n' +
    '  gl_FragColor = v_Color;\n' +
    '}\n';


// CONSTANTS ///////////////////////////////////////////////////////////////////////////////////////////////////////////

// Hexagon states.
const DEAD = 0;
const SPAWNING = 1;
const ALIVE = 2;
const DYING = 3;

// Chance to kill or spawn a rectangle on a given frame.
const ACTION_CHANCE = .0015;

const VERT_LEN = 6;


function main() {

    // WEBGL SETUP /////////////////////////////////////////////////////////////////////////////////////////////////////

    const canvas = document.getElementById('webgl');

    const gl = getWebGLContext(canvas);
    if (!gl) {
        console.log("Failed to get the rendering context for WebGL");
        return;
    }

    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    const vertexColorBuffer = gl.createBuffer();
    if (!vertexColorBuffer) {
        console.log('Failed to create the color buffer object');
        return -1;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);

    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }

    const a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }

    // INITIALIZE HEXAGON GRID /////////////////////////////////////////////////////////////////////////////////////////

    const RADIUS = 0.1  // Radius of each hexagon

    const sin60 = Math.sin(Math.PI / 3);
    const cos60 = Math.cos(Math.PI / 3);
    const dx = RADIUS * (1 + cos60);    // X-distance bw each hex
    const dy = 2 * RADIUS * sin60;      // Y-distance bw each hex

    let hexagons = [];

    let curX = -1, curY;
    let yAdj = false;
    let glX, glY, color;

    while (curX <= 1 + RADIUS) {

        curY = 1;

        while (curY > -1 - RADIUS) {
            glX = curX;
            glY = curY - (yAdj ? dy/2 : 0);     // Offset every other row to neatly pack the grid
            color = [Math.random(), Math.random(), Math.random(), 1];

            hexagons.push(new Hexagon(
                glX, glY,
                RADIUS * .9, // Draw a border around each hex.
                0, color,
                Math.random() < .75 // Initially spawn hex with 75% chance.
            ))

            curY -= dy;
        }
        yAdj = !yAdj;
        curX += dx;
    }

    // ANIMATION ///////////////////////////////////////////////////////////////////////////////////////////////////////

    const update = function(delta) {
        hexagons.forEach((hex) => {hex.update(delta);});
    }

    let n;
    let dataGL;
    const render = function() {
        dataGL = [];
        for (const hex of hexagons) {
            if (hex.state !== DEAD)
                dataGL.push(...hex.getDataTriangles());
        }
        n = initVertexBuffers(gl, a_Position, a_Color, dataGL);
        gl.clear(gl.COLOR_BUFFER_BIT);
        gl.drawArrays(gl.TRIANGLES, 0, n);
    }

    let prevTime = performance.now();
    let delta;
    const tick = function(curTime) {
        delta = (curTime - prevTime) / 1000;
        prevTime = curTime;

        update(delta);
        render();

        requestAnimationFrame(tick);
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);

    tick();
}


// HEXAGON /////////////////////////////////////////////////////////////////////////////////////////////////////////////

class Hexagon {
    /**
     * A regular hexagon.
     * @param x             X Position of center.
     * @param y             Y Position of center.
     * @param radius        Distance from radius to each vertex.
     * @param rotation      Counter-clockwise angle in degrees.
     * @param color         RGBA color.
     * @param startAlive    If true, hexagon is initially in "ALIVE" state. Else, initially in "DEAD" state.
     */
    constructor(x, y, radius, rotation, color,
                startAlive=true) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;

        this.rotation = rotation;
        this.scale = startAlive ? 1 : 0;
        this.state = startAlive ? ALIVE : DEAD;
    }

    /**
     * Calculate & return the vertices as [x1, y1, x2, y2, ...]
     */
    getVertices() {
        let vertices = [];
        for (let i = this.rotation; i < 360 + this.rotation; i += 60) {
            let angle = i * Math.PI / 180.0;
            let vertX = this.x + this.radius * Math.cos(angle) * this.scale;
            let vertY = this.y + this.radius * Math.sin(angle) * this.scale;
            vertices.push(vertX);
            vertices.push(vertY);
        }
        return vertices;
    }

    /**
     * Return GL data as triangle vertices.
     *
     * Each triangle consists of three vertices, each with a color.
     * Data is returned as:
     * [x, y, r, g, b, a,
     *  x, y, r, g, b, a,
     *  ...]
     */
    getDataTriangles() {
        let vertices = this.getVertices();
        let data = [];
        for (let i = 0; i < 4; i++) {
            let j = 2 * i + 2;
            // Push vertices as triangles.
            data.push(vertices[0], vertices[1], ...this.color)
            data.push(vertices[j], vertices[j + 1], ...this.color)
            data.push(vertices[j + 2], vertices[j + 3], ...this.color)
        }
        return data;
    }

    /**
     * Return GL data as [x1, y1, r, g, b, a, x2, y2, r, g, b, a, ...]
     */
    getData() {
        let vertices = this.getVertices();
        let data = [];
        for (let i = 0; i < vertices.length; i += 2) {
            data.push(vertices[i], vertices[i + 1]);
            data.push(...this.color);
        }
        return data;
    }

    /**
     * Start killing an alive hexagon.
     */
    kill() {
        this.state = DYING;
        this.scale = 1;
    }

    /**
     * Start (re)spawning a dead hexagon.
     * Also generates a new color.
     */
    spawn() {
        this.state = SPAWNING;
        this.scale = 0;
        this.color = [Math.random(), Math.random(), Math.random(), 1.0];
    }

    /**
     * Update hexagon.
     */
    update(delta) {
        if (this.state === DEAD) {
            if (Math.random() < ACTION_CHANCE) {
                this.spawn();
            }
        }

        else if (this.state === ALIVE) {
            if (Math.random() < ACTION_CHANCE) {
                this.kill();
            }
        }

        else if (this.state === DYING) {
            this.scale -= 1.5 * delta;
            this.rotation += 500 * delta;

            if (this.scale <= 0) {
                this.state = DEAD;
                this.scale = 0;
            }
        }

        else if (this.state === SPAWNING) {
            this.scale += 1.5 * delta;
            this.rotation -= 500 * delta;

            if (this.scale >= 1) {
                this.state = ALIVE;
                this.scale = 1;
                this.rotation = 0;
            }
        }

        else {
            // Impossible state.
            console.log("¡¿inconcebible?!");
            this.kill();
        }
    }
}


function initVertexBuffers(gl, a_Position, a_Color, data) {
    const dataGL = new Float32Array(data);
    const FSIZE = dataGL.BYTES_PER_ELEMENT;

    // Write vertex data to buffer.
    gl.bufferData(gl.ARRAY_BUFFER, dataGL, gl.STATIC_DRAW);

    // Vertex positions.
    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * VERT_LEN, 0);
    gl.enableVertexAttribArray(a_Position);

    // Vertex colors.
    gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * VERT_LEN, FSIZE * 2);
    gl.enableVertexAttribArray(a_Color);

    // Return number of vertices to draw.
    return dataGL.length / VERT_LEN;
}
