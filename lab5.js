
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


function main() {
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

    let a = new Hexagon(-0.5, 0.5,
        0.25, 1.0, 0,
        [1.0, 0.5, 0.75, 1.0]);

    let b = new Hexagon(0.5, 0.5,
        0.25, 0.5, 45,
        [1.0, 0.1, 0.75, 1.0]);

    let c = new Hexagon(0.0, -0.5,
        0.25, 0.75, 10,
        [0.25, 1.5, 0.75, 1.0]);

    let combinedData = [...a.getDataTriangles(), ...b.getDataTriangles(), ...c.getDataTriangles()];

    const n = initVertexBuffers(gl, combinedData);
    if (n < 0) {
        console.log('Failed to set the positions of the vertices');
        return;
    }

    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLES, 0, n);

}

class Hexagon {
    /**
     * A regular hexagon.
     * @param x             X Position of center.
     * @param y             Y Position of center.
     * @param radius        Distance from radius to each vertex.
     * @param sizeFactor    Scales the original hexagon.
     * @param rotation      Counter-clockwise angle in degrees.
     * @param color         RGBA color.
     */
    constructor(x, y, radius, sizeFactor, rotation, color) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.sizeFactor = sizeFactor;
        this.rotation = rotation;
        this.color = color;
    }

    /**
     * Calculate & return the vertices as [x1, y1, x2, y2, ...]
     */
    getVertices() {
        let vertices = [];
        for (let i = this.rotation; i < 360 + this.rotation; i += 60) {
            let angle = i * Math.PI / 180.0;
            let vertX = this.x + this.radius * Math.cos(angle) * this.sizeFactor;
            let vertY = this.y + this.radius * Math.sin(angle) * this.sizeFactor;
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
}


function initVertexBuffers(gl, data) {
    const dataGL = new Float32Array(data);
    const VERT_LEN = 6;

    const vertexColorBuffer = gl.createBuffer();
    if (!vertexColorBuffer) {
        console.log('Failed to create the color buffer object');
        return -1;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, dataGL, gl.STATIC_DRAW);

    const FSIZE = dataGL.BYTES_PER_ELEMENT;

    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, FSIZE * VERT_LEN, 0);
    gl.enableVertexAttribArray(a_Position);

    const a_Color = gl.getAttribLocation(gl.program, 'a_Color');
    if (a_Color < 0) {
        console.log('Failed to get the storage location of a_Color');
        return -1;
    }

    gl.vertexAttribPointer(a_Color, 4, gl.FLOAT, false, FSIZE * VERT_LEN, FSIZE * 2);
    gl.enableVertexAttribArray(a_Color);

    return dataGL.length / VERT_LEN;
}
