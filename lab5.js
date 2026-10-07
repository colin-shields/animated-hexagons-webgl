
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

// Length of each vertex in dataGL.
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

    // Enable alpha channel blending (for light rays).
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

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

    // INITIALIZE LIGHT RAYS ///////////////////////////////////////////////////////////////////////////////////////////

    let rays = [
        new LightRay(-1.1, 1.1, 1.75, 0.5, 45),
        new LightRay(-1.1, 1.1, 2.0, 0.5, 30, undefined, undefined, -1),
        new LightRay(-1.1, 1.1, 1.5, 0.75, 60),

        new LightRay(1.1, 1.1, 1.75, 0.5, 135, [0, 1, 1], [90, 180]),
        new LightRay(1.1, 1.1, 1.0, 0.25, 120, [0, 1, 1], [90, 180], -1),
        new LightRay(1.1, 1.1, 1.25, 0.75, 150, [0, 1, 1], [90, 180]),
    ];

    // ANIMATION ///////////////////////////////////////////////////////////////////////////////////////////////////////

    const update = function(delta) {
        hexagons.forEach((hex) => {hex.update(delta);});
        rays.forEach((ray) => {ray.update(delta);});
    }

    let n;
    let dataGL;
    const render = function() {
        dataGL = [];
        for (const hex of hexagons) {
            if (hex.state !== DEAD)
                dataGL.push(...hex.getDataTriangles());
        }
        for (const ray of rays) {
            dataGL.push(...ray.getDataTriangles());
        }
        n = updateVertexBuffers(gl, a_Position, a_Color, dataGL);
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


// SHAPES //////////////////////////////////////////////////////////////////////////////////////////////////////////////

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


class LightRay {
    /**
     * A ray of light.
     * @param x             X position of rotation axis.
     * @param y             Y position of rotation axis.
     * @param length        Length of ray from rotation axis.
     * @param width         Width of ray at its tail, perpendicular to the length.
     * @param initAngle     Initial angle of ray.
     * @param color         Color of ray as [r, g, b]. Note that alpha will be assigned automatically.
     * @param angleBounds   Angle boundaries as [lower, upper]. If not within range, the movement will switch directions.
     * @param initDirection Initial direction of ray. Direction will be switched at random.
     * @param initSpeed     Initial speed of ray. Speed will be increased or decreased at random.
     */
    constructor(x, y, length, width, initAngle=45.0, color=[1, 1, 0],
                angleBounds=[0, 90], initDirection=1, initSpeed=2) {
        this.x = x;
        this.y = y;
        this.length = length;
        this.width = width;
        this.angle = initAngle;
        this.color = color;
        this.angleBounds = angleBounds;
        this.direction = initDirection;
        this.speed = initSpeed;
    }

    getDataTriangles() {
        let angleRad = this.angle * Math.PI / 180.0;
        let cosB = Math.cos(angleRad);
        let sinB = Math.sin(angleRad);
        let l = this.length;
        let hw = this.width / 2;

        return [
            this.x, this.y, ...this.color, 0.5,
            this.x + l * cosB + hw * sinB, this.y - l * sinB + hw * cosB, 0, 0, 0, 0.0,
            this.x + l * cosB - hw * sinB, this.y - l * sinB - hw * cosB, 0, 0, 0, 0.0,
        ];
    }

    update(delta) {
        if (Math.random() < ACTION_CHANCE) {
            this.direction *= -1;
        }

        // Randomly increase or decrease speed.
        if (Math.random() < .5) {
            this.speed += .05;
        } else {
            this.speed -= .05;
        }

        // Don't go too fast or too slow.
        if (this.speed > 5) {
            this.speed -= .2;
        } else if (this.speed < 0.5) {
            this.speed += .2;
        }

        this.speed = Math.abs(this.speed);  // keep speed positive so multiplying by direction works correctly

        // Don't go out of bounds.
        if (this.angle < this.angleBounds[0]) {
            this.direction = 1;
        } else if (this.angle > this.angleBounds[1]) {
            this.direction = -1;
        }

        if (delta > 0) {
            // For some reason, delta was occasionally NaN.
            this.angle += this.direction * delta * this.speed;
        }
    }
}


// VERTEX BUFFERS //////////////////////////////////////////////////////////////////////////////////////////////////////

function updateVertexBuffers(gl, a_Position, a_Color, data) {
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
