// Vertex shader program
const VSHADER_SOURCE =
    'attribute vec4 a_Position;\n' +
    'void main() {\n' +
    '  gl_Position = a_Position;\n' +
    '  gl_PointSize = 10.0;\n' +
    '}\n';

// Fragment shader program
const FSHADER_SOURCE =
    'precision mediump float;\n' +
    'uniform vec4 u_FragColor;\n' +
    'void main() {\n' +
    '  gl_FragColor = u_FragColor;\n' +
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

    let a = new Hexagon(0.0, 0.0,
        0.5, 1.0, 0,
        [1.0, 0.5, 0.75, 1.0]);

    console.log(a.getVertices());

    const n = initVertexBuffers(gl, a.getVertices(), a.color)
    if (n < 0) {
        console.log('Failed to set the positions of the vertices');
        return;
    }


    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.drawArrays(gl.TRIANGLE_FAN, 0, n);

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
}


function initVertexBuffers(gl, vertices, color) {
    const n = vertices.length / 2;

    const vertexBuffer = gl.createBuffer();
    if (!vertexBuffer) {
        console.log('Failed to create the buffer object');
        return -1;
    }

    const u_FragColor = gl.getUniformLocation(gl.program, 'u_FragColor');
    if (!u_FragColor) {
        console.log('Failed to get the storage location of u_FragColor');
        return;
    }
    gl.uniform4f(u_FragColor, ...color);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

    const a_Position = gl.getAttribLocation(gl.program, 'a_Position');
    if (a_Position < 0) {
        console.log('Failed to get the storage location of a_Position');
        return -1;
    }

    gl.vertexAttribPointer(a_Position, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    return n;
}
