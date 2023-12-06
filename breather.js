function main() {
    const canvas = document.getElementById('glcanvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');

    if (!gl) {
        alert('Unable to initialize WebGL. Your browser may not support it.');
        return;
    }

    // Set clear color to black, fully opaque
    // gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clearColor(0.0, 0.0, 0.0, 0.0);
    // Clear the color buffer with specified clear color
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vsSource = `
      // Vertex Shader Code
      attribute vec3 aVertexPosition;
      attribute vec3 aVertexNormal;

      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      uniform mat3 uNormalMatrix;

      uniform vec3 ambientLight;
      uniform vec3 directionalLightColor;
      uniform vec3 directionalVector;

      varying highp vec3 vLighting;

      void main(void) {
          gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aVertexPosition, 1.0);

          // Transform the normal to view space
          highp vec3 transformedNormal = normalize(uNormalMatrix * aVertexNormal);

          // Calculate lighting effect
          highp vec3 ambient = ambientLight;
          highp vec3 directionalLight = normalize(directionalVector);
          highp float directional = max(dot(transformedNormal, directionalLight), 0.0);
          vLighting = ambient + (directionalLightColor * directional);
      }
      `;

    const fsSource = `
      // Fragment Shader Code
      varying highp vec3 vLighting;

      void main(void) {
          highp vec3 color = vec3(0.0, 0.2, 0.6); // White color, you can change this based on your assignment needs
          gl_FragColor = vec4(color * vLighting, 1.0);
      }
      `;
    // Define the shaders
    const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    const programInfo = initProgramInfo(gl, shaderProgram);

    // Parameters for generating Breather surface
    let aa = 0.4;
    let uRange = { min: -14, max: 14 };
    let vRange = { min: -37, max: 37 };
    let uSegments = 30;
    let vSegments = 30;
    let data = generateBreatherSurface(aa, uRange, vRange, uSegments, vSegments); // Increase segments for higher resolution

    let buffers = initBuffers(gl, data);
    let cameraZPosition = -50; // Initial camera Z position
    let camera = initCamera(gl);

    let mouseDown = false;
    let lastMouseX = null;
    let lastMouseY = null;
    let rotationMatrix = glMatrix.mat4.create();

    function regenerateSurface() {
        data = generateBreatherSurface(aa, uRange, vRange, uSegments, vSegments);
        buffers = initBuffers(gl, data);
        // render();
    }

    // Event listeners for the parameters
    document.getElementById('aa-range').addEventListener('input', function(event) {
        aa = parseFloat(event.target.value);
        document.getElementById('aa-value').textContent = aa.toFixed(2);
        regenerateSurface();
    });

    document.getElementById('u-min-range').addEventListener('input', function(event) {
        uRange.min = parseFloat(event.target.value);
        document.getElementById('u-min-value').textContent = uRange.min;
        regenerateSurface();
    });

    document.getElementById('u-max-range').addEventListener('input', function(event) {
        uRange.max = parseFloat(event.target.value);
        document.getElementById('u-max-value').textContent = uRange.max;
        regenerateSurface();
    });

    document.getElementById('v-min-range').addEventListener('input', function(event) {
        vRange.min = parseFloat(event.target.value);
        document.getElementById('v-min-value').textContent = vRange.min;
        regenerateSurface();
    });

    document.getElementById('v-max-range').addEventListener('input', function(event) {
        vRange.max = parseFloat(event.target.value);
        document.getElementById('v-max-value').textContent = vRange.max;
        regenerateSurface();
    });

    document.getElementById('v-segments-range').addEventListener('input', function(event) {
        vSegments = parseFloat(event.target.value);
        document.getElementById('v-segments-value').textContent = vSegments;
        regenerateSurface();
    });

    document.getElementById('u-segments-range').addEventListener('input', function(event) {
        uSegments = parseFloat(event.target.value);
        document.getElementById('u-segments-value').textContent = uSegments;
        regenerateSurface();
    });

    // Event listener for reseting the parameter values
    document.getElementById('resetBotton').addEventListener('click', function() {
        // Reset parameters to their default values
        aa = 0.4;
        uRange = { min: -14, max: 14 };
        vRange = { min: -37, max: 37 };
        uSegments = 30;
        vSegments = 30;

        // Update the slider positions and displayed values
        document.getElementById('aa-range').value = aa;
        document.getElementById('aa-value').textContent = aa.toFixed(2);
        document.getElementById('u-min-range').value = uRange.min;
        document.getElementById('u-min-value').textContent = uRange.min;
        document.getElementById('u-max-range').value = uRange.max;
        document.getElementById('u-max-value').textContent = uRange.max;
        document.getElementById('v-min-range').value = vRange.min;
        document.getElementById('v-min-value').textContent = vRange.min;
        document.getElementById('v-max-range').value = vRange.max;
        document.getElementById('v-max-value').textContent = vRange.max;
        document.getElementById('u-segments-range').value = uSegments;
        document.getElementById('u-segments-value').textContent = uSegments;
        document.getElementById('v-segments-range').value = vSegments;
        document.getElementById('v-segments-value').textContent = vSegments;

        regenerateSurface();
    });

    function handleMouseDown(event) {
        mouseDown = true;
        lastMouseX = event.clientX;
        lastMouseY = event.clientY;
    }

    function handleMouseUp(event) {
        mouseDown = false;
    }

    function handleMouseMove(event) {
        if (!mouseDown) {
            return;
        }
        const newX = event.clientX;
        const newY = event.clientY;
        const deltaX = newX - lastMouseX;
        const deltaY = newY - lastMouseY;

        const newRotationMatrix = glMatrix.mat4.create();
        // glMatrix.mat4.rotate(newRotationMatrix, newRotationMatrix, glMatrix.toRadian(deltaX / 10), [0, 1, 0]);
        // glMatrix.mat4.rotate(newRotationMatrix, newRotationMatrix, glMatrix.toRadian(deltaY / 10), [1, 0, 0]);

        const radiansX = deltaX / 10 * (Math.PI / 180);
        const radiansY = deltaY / 10 * (Math.PI / 180);
        glMatrix.mat4.rotate(newRotationMatrix, newRotationMatrix, radiansX, [0, 1, 0]);
        glMatrix.mat4.rotate(newRotationMatrix, newRotationMatrix, radiansY, [1, 0, 0]);

        glMatrix.mat4.multiply(rotationMatrix, newRotationMatrix, rotationMatrix);

        lastMouseX = newX;
        lastMouseY = newY;
    }

    function handleWheel(event) {
        event.preventDefault();
        const delta = Math.sign(event.deltaY) * -2; // The amount you zoom on each wheel event
        cameraZPosition += delta;
        // Clamp the camera's z position to prevent it from going too far or too close
        cameraZPosition = Math.min(Math.max(cameraZPosition, -100), -10);
    }

    canvas.addEventListener('mousedown', handleMouseDown, false);
    canvas.addEventListener('mouseup', handleMouseUp, false);
    canvas.addEventListener('mousemove', handleMouseMove, false);
    canvas.addEventListener('wheel', handleWheel, { passive: false });

    function initShaderProgram(gl, vsSource, fsSource) {
        const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

        // Create the shader program
        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);

        // Bind the vertex shader's attribute location 0 before linking
        gl.bindAttribLocation(shaderProgram, 0, 'aVertexPosition');

        gl.linkProgram(shaderProgram);

        // If creating the shader program failed, alert
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
            return null;
        }

        return shaderProgram;
    }

    function loadShader(gl, type, source) {
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        // See if it compiled successfully
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    function initProgramInfo(gl, shaderProgram) {
        return {
            program: shaderProgram,
            attribLocations: {
                vertexPosition: gl.getAttribLocation(shaderProgram, 'aVertexPosition'),
                vertexNormal: gl.getAttribLocation(shaderProgram, 'aVertexNormal'),
            },
            uniformLocations: {
                projectionMatrix: gl.getUniformLocation(shaderProgram, 'uProjectionMatrix'),
                modelViewMatrix: gl.getUniformLocation(shaderProgram, 'uModelViewMatrix'),
                normalMatrix: gl.getUniformLocation(shaderProgram, 'uNormalMatrix'),
                // Add additional uniforms like lighting and material properties here
                ambientLight: gl.getUniformLocation(shaderProgram, 'ambientLight'),
                directionalLightColor: gl.getUniformLocation(shaderProgram, 'directionalLightColor'),
                directionalVector: gl.getUniformLocation(shaderProgram, 'directionalVector'),
            },
        };
    }

    function breatherParametric(u, v, aa) {
        // Constants derived from 'aa'
        let w = Math.sqrt(1 - aa * aa);
        let denom = aa * (Math.pow(w * Math.cosh(aa * u), 2) + Math.pow(aa * Math.sin(w * v), 2));

        // Breather parametric equations
        let x = -u + 2 * (1 - aa * aa) / denom * Math.cosh(aa * u) * Math.sin(aa * u);
        let y = 2 * w * Math.cosh(aa * u) / denom * (-w * Math.cos(v) * Math.cos(w * v) - Math.sin(v) * Math.sin(w * v));
        let z = 2 * w * Math.cosh(aa * u) / denom * (-w * Math.sin(v) * Math.cos(w * v) + Math.cos(v) * Math.sin(w * v));

        return [x, y, z];
    }

    function generateBreatherSurface(aa, uRange, vRange, uSegments, vSegments) {
        const positions = [];
        const normals = [];
        const indices = [];

        const du = (uRange.max - uRange.min) / uSegments;
        const dv = (vRange.max - vRange.min) / vSegments;

        for (let i = 0; i <= uSegments; i++) {
            let u = i / uSegments * (uRange.max - uRange.min) + uRange.min;

            for (let j = 0; j <= vSegments; j++) {
                let v = j / vSegments * (vRange.max - vRange.min) + vRange.min;

                // Calculate positions from parametric equations
                const [x, y, z] = breatherParametric(u, v, aa);
                positions.push(x, y, z);

                // Calculate the tangent vectors
                const [dxu, dyu, dzu] = breatherParametric(u + du, v, aa).map((val, idx) => val - [x, y, z][idx]);
                const [dxv, dyv, dzv] = breatherParametric(u, v + dv, aa).map((val, idx) => val - [x, y, z][idx]);

                // Compute the normal with the cross product of the tangent vectors
                let nx = dyu * dzv - dzu * dyv;
                let ny = dzu * dxv - dxu * dzv;
                let nz = dxu * dyv - dyu * dxv;

                // Normalize the normal
                let len = Math.sqrt(nx * nx + ny * ny + nz * nz);
                nx /= len;
                ny /= len;
                nz /= len;

                normals.push(nx, ny, nz);
            }
        }

        // Calculate indices for the vertex positions
        for (let i = 0; i < uSegments; i++) {
            for (let j = 0; j < vSegments; j++) {
                const a = i * (vSegments + 1) + j;
                const b = a + vSegments + 1;
                indices.push(a, b, a + 1, a + 1, b, b + 1);
            }
        }

        return {
            positions,
            normals,
            indices
        };
    }

    function initBuffers(gl, data) {
        // Create a buffer for the positions
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.positions), gl.STATIC_DRAW);

        // Create a buffer for the normals
        const normalBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data.normals), gl.STATIC_DRAW);

        // Create a buffer for the indices
        const indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(data.indices), gl.STATIC_DRAW);

        return {
            position: positionBuffer,
            normal: normalBuffer,
            indices: indexBuffer
        };
    }

    function initCamera(gl) {
        const fieldOfView = 45 * Math.PI / 180;   // in radians
        const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
        const zNear = 0.1;
        const zFar = 1000.0; // Adjust if necessary
        const projectionMatrix = glMatrix.mat4.create();

        glMatrix.mat4.perspective(projectionMatrix, fieldOfView, aspect, zNear, zFar);

        const cameraMatrix = glMatrix.mat4.create();
        glMatrix.mat4.translate(cameraMatrix, cameraMatrix, [0, 0, cameraZPosition]); // Use the global cameraZPosition

        return {
            projectionMatrix,
            cameraMatrix
        };
    }

    function drawScene(gl, programInfo, buffers, camera) {
        // gl.clearColor(0.0, 0.0, 0.0, 1.0); // Clear to black, fully opaque
        // gl.clearColor(0.0, 0.0, 0.0, 0.2); // Clear to black, fully opaque
        gl.clearDepth(1.0);                 // Clear everything
        gl.enable(gl.DEPTH_TEST);           // Enable depth testing
        gl.depthFunc(gl.LEQUAL);            // Near things obscure far things

        // Clear the canvas before we start drawing on it.
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        // Set the drawing position to the "identity" point, which is the center of the scene.
        const modelViewMatrix = glMatrix.mat4.create();

        // Apply the camera's position
        glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, camera.cameraMatrix);

        // Apply the rotation matrix from mouse interaction
        glMatrix.mat4.multiply(modelViewMatrix, modelViewMatrix, rotationMatrix);

        // Bind the position buffer.
        gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);

        // Tell WebGL how to pull out the positions from the position buffer into the vertexPosition attribute.
        gl.vertexAttribPointer(
            programInfo.attribLocations.vertexPosition,
            3, // number of components per vertex position (x, y, z)
            gl.FLOAT, // type of the components
            false, // normalize
            0, // stride (0 = use type and numComponents above)
            0  // offset (start at the beginning of the buffer)
        );
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        // Tell WebGL how to pull out the normals from
        // the normal buffer into the vertexNormal attribute.
        {
            const numComponents = 3;  // pull out 3 values per iteration
            const type = gl.FLOAT;    // the data in the buffer is 32bit floats
            const normalize = false;  // normalize the data (convert from 0-255 to 0-1)
            const stride = 0;         // how many bytes to get from one set to the next
            const offset = 0;         // how many bytes inside the buffer to start from
            gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
            gl.vertexAttribPointer(
                programInfo.attribLocations.vertexNormal,
                numComponents,
                type,
                normalize,
                stride,
                offset);
            gl.enableVertexAttribArray(programInfo.attribLocations.vertexNormal);
        }

        // Tell WebGL which indices to use to index the vertices
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);

        // Tell WebGL to use our program when drawing
        gl.useProgram(programInfo.program);

        // Set the shader uniforms
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.projectionMatrix,
            false,
            camera.projectionMatrix);
        gl.uniformMatrix4fv(
            programInfo.uniformLocations.modelViewMatrix,
            false,
            modelViewMatrix);

        // Compute the normal matrix from the model-view matrix
        const normalMatrix = glMatrix.mat3.create();
        glMatrix.mat3.normalFromMat4(normalMatrix, modelViewMatrix);

        // Pass the normal matrix to the shader
        gl.uniformMatrix3fv(
            programInfo.uniformLocations.normalMatrix,
            false,
            normalMatrix
        );

        // Set the lighting uniforms
        const ambientLightUniformValue = [0.3, 0.3, 0.3];
        const directionalLightColorUniformValue = [1, 1, 1];
        const directionalVectorUniformValue = [0.85, 0.8, 0.75];

        gl.uniform3fv(programInfo.uniformLocations.ambientLight, ambientLightUniformValue);
        gl.uniform3fv(programInfo.uniformLocations.directionalLightColor, directionalLightColorUniformValue);
        gl.uniform3fv(programInfo.uniformLocations.directionalVector, directionalVectorUniformValue);

        // Draw the elements
        const vertexCount = data.indices.length; // Use the length directly
        const type = gl.UNSIGNED_SHORT;
        const offset = 0;
        gl.drawElements(gl.TRIANGLES, vertexCount, type, offset);
    }

    function render() {
        camera = initCamera(gl);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);
        requestAnimationFrame(render);
        drawScene(gl, programInfo, buffers, camera);
        gl.disableVertexAttribArray(programInfo.attribLocations.vertexPosition);
    }

    // Start rendering
    render();
}

window.onload = main;