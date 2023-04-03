var state = {};
var game;
var sceneFile = "scene.json"; // can change this to be the name of your scene

// This function loads on window load, uses async functions to load the scene then try to render it
window.onload = async () => {
    try {
        console.log("Starting to load scene file");
        await parseSceneFile(`./statefiles/${sceneFile}`, state);
        main();
    } catch (err) {
        console.error(err);
        alert(err);
    }
}

/**
 * 
 * @param {object - contains vertex, normal, uv information for the mesh to be made} mesh 
 * @param {object - the game object that will use the mesh information} object 
 * @purpose - Helper function called as a callback function when the mesh is done loading for the object
 */
async function createMesh(mesh, object, vertShader, fragShader, materialDetails = null) {
    let testModel = new Model(state.gl, object, mesh, materialDetails);
    testModel.vertShader = vertShader ? vertShader : state.vertShaderSample;
    testModel.fragShader = fragShader ? fragShader : state.fragShaderSample;
    await testModel.setup();
    addObjectToScene(state, testModel);
    return testModel;
}

/**
 * Main function that gets called when the DOM loads
 */
async function main() {
    //document.body.appendChild( stats.dom );
    const canvas = document.querySelector("#glCanvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Initialize the WebGL2 context
    var gl = canvas.getContext("webgl2");

    // Only continue if WebGL2 is available and working
    if (gl === null) {
        printError('WebGL 2 not supported by your browser',
            'Check to see you are using a <a href="https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API#WebGL_2_2" class="alert-link">modern browser</a>.');
        return;
    }

    /**
     * Sample vertex and fragment shader here that simply applies MVP matrix 
     * and diffuse colour of each object
     */
    const vertShaderSample =
        `#version 300 es
        in vec3 aPosition;
        in vec3 aNormal;
        in vec2 aUV;

        uniform mat4 uProjectionMatrix;
        uniform mat4 uViewMatrix;
        uniform mat4 uModelMatrix;
        uniform vec3 uCameraPosition;
        uniform mat4 uNormalMatrix;

        out vec2 oUV;
        out vec3 oFragPosition;
        out vec3 oNormal;
        out vec3 oCameraPosition;

        void main() {
            // Postion of the fragment in world space
            gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(aPosition, 1.0);

            oUV = aUV;

            // update position of the fragment in the world space
            oFragPosition = (uModelMatrix * vec4(aPosition, 1.0)).xyz;

            // update normal with the correct value
            oNormal = (uNormalMatrix * vec4(aNormal, 0.0)).xyz;

            // pass the camera position to the fragment shader
            oCameraPosition = uCameraPosition;
        }
        `;

    const fragShaderSample =
    `#version 300 es
    #define MAX_LIGHTS 20
    precision highp float;

    // struct for defining point light with its position, colour and strength fields
    struct PointLight {
        vec3 position;
        vec3 colour;
        float strength;
        float constant;
        float linear;
        float quadratic;
    };

    // struct for defining direction light
    struct DirLight {
        vec3 position;
        vec3 colour;
        vec3 direction;
    };

    // initialize numLights and pointLights array uniforms
    uniform int numLights;
    uniform int numDirLights;
    uniform PointLight[MAX_LIGHTS] pointLights;
    uniform DirLight[MAX_LIGHTS] dirLights;

    in vec2 oUV;
    in vec3 oNormal;
    in vec3 oFragPosition;
    in vec3 oCameraPosition;

    // material properties
    uniform vec3 diffuseVal; //Kd
    uniform vec3 ambientVal; //Ka
    uniform vec3 specularVal; //Ks
    uniform float nVal; //n
    uniform float alpha;

    uniform int samplerExists;
    uniform sampler2D uTexture;

    out vec4 fragColor;

    // function for calculating point lights
    vec3 calculatePointLights(PointLight point, vec3 ambientVal, vec3 diffuseVal, vec3 specularVal, vec3 normal, vec3 fragPosition, vec3 viewVector, float nVal) {
        
        vec4 textureColor = vec4(1.0, 1.0, 1.0, 1.0);
        if (samplerExists == 1) {
            textureColor = texture(uTexture, oUV);
        }
        float distance = length(point.position - fragPosition);
        float attenuation = point.strength / (point.constant + point.linear * distance + point.quadratic * (distance * distance));

        // Calculate ambient term Ka*Lc*Ls
        // vec3 ambient = ambientVal * textureColor.xyz * diffuseVal * 0.3;
        vec3 ambient = ambientVal * textureColor.xyz * diffuseVal * attenuation;

        // Calculate diffuse term Kd*Lc*dot(N,L)
        // get direction of light relative to the object
        vec3 lightDirection = normalize(point.position - fragPosition);
        float diff = max(dot(lightDirection, normal), 0.0);
        vec3 diffuse = diff * diffuseVal * point.colour;

        // check if sampler exists, if so, then mix with diffuse
        if (samplerExists == 1) {
            diffuse = mix(diffuse, textureColor.rgb, 0.5);
        }
        diffuse *= attenuation;

        // Calculate specular term Ks*Lc*dot(H,N)^(n*n_all)
        // calculate half vector first
        vec3 halfVector = normalize(viewVector + lightDirection);
        float spec = pow(max(dot(normal, halfVector), 0.0), nVal);
        vec3 specular = spec * specularVal * point.colour * attenuation;

        // Calculate total 
        vec3 total = (ambient + diffuse + specular);
        return total;
    }

    // function for calculating directional lights
    vec3 calculateDirLights(DirLight point, vec3 ambientVal, vec3 diffuseVal, vec3 specularVal, vec3 normal, vec3 viewVector, float nVal) {
        
        vec4 textureColor = vec4(1.0, 1.0, 1.0, 1.0);
        if (samplerExists == 1) {
            textureColor = texture(uTexture, oUV);
        }

        // calculate ambient
        vec3 ambient = point.colour * ambientVal * diffuseVal * textureColor.xyz;
        
        // calculate diffuse
        vec3 lightDirection = normalize(point.direction);
        float diff = max(dot(lightDirection, normal), 1.0);
        vec3 diffuse = diff * diffuseVal * point.colour;
        if (samplerExists == 1) {
            diffuse = mix(diffuse, textureColor.rgb, 0.5);
        }

        // calculate specular
        vec3 reflectDirection = reflect(lightDirection, normal);
        float spec = pow(max(dot(viewVector, reflectDirection), 0.0), nVal);
        vec3 specular = spec * specularVal * point.colour * textureColor.xyz;

        // Calculate total
        vec3 total = ambient + diffuse + specular;
        return total;
    }

    void main() {

        // normalize the normal
        vec3 normal = normalize(oNormal);

        // calculate view vector
        vec3 viewVector = normalize(oCameraPosition - oFragPosition);

        // pass in pointLights in loop to calculate total colour
        vec3 total = vec3(0.0, 0.0, 0.0);
        // calculate point lights
        for (int i = 0; i < numLights; i++) {
            total += calculatePointLights(pointLights[i], ambientVal, diffuseVal, specularVal, normal, oFragPosition, viewVector, nVal);
        }
        // calculate direction lights
        for (int j = 0; j < numDirLights; j++) {
            total += calculateDirLights(dirLights[j], ambientVal, diffuseVal, specularVal, normal, viewVector, nVal);
        }

        // return fragment color
        fragColor = vec4(total, alpha);
    }
    `;

    /**
     * Initialize state with new values (some of these you can replace/change)
     */
    state = {
        ...state, // this just takes what was already in state and applies it here again
        gl,
        vertShaderSample,
        fragShaderSample,
        canvas: canvas,
        objectCount: 0,
        lightIndices: [],
        keyboard: {},
        mouse: { sensitivity: 0.2 },
        meshCache: {},
        samplerExists: 0,
        samplerNormExists: 0,
        gameStart: false,
        gameOver: false,
        reset: 0,
        coins: 0,
    };

    state.numLights = state.pointLights.length;
    state.numDirLights = state.dirLights.length;

    const now = new Date();
    for (let i = 0; i < state.loadObjects.length; i++) {
        const object = state.loadObjects[i];

        if (object.type === "mesh") {
            await addMesh(object);
        } else if (object.type === "cube") {
            addCube(object, state);
        } else if (object.type === "plane") {
            addPlane(object, state);
        } else if (object.type.includes("Custom")) {
            addCustom(object, state);
        }
    }

    const then = new Date();
    const loadingTime = (then.getTime() - now.getTime()) / 1000;
    console.log(`Scene file loaded in ${loadingTime} seconds.`);

    game = new Game(state);
    await game.onStart();
    loadingPage.remove();
    let element1 = document.querySelector('#coinProgress');
    console.log(element1);
    if (element1) {
        let hidden1 = element1.getAttribute("hidden");
        if (hidden1) {
            element1.removeAttribute("hidden");
        }
    }
    let element2 = document.querySelector('#gameStart');
    if (element2) {
        let hidden2 = element2.getAttribute("hidden");
        if (hidden2) {
            element2.removeAttribute("hidden");
        }
    }
    const initialView = JSON.parse(JSON.stringify(state.settings.camera)); //save initial camera position and views
    startRendering(gl, state, initialView); // now that scene is setup, start rendering it
}

/**
 * 
 * @param {object - object containing scene values} state 
 * @param {object - the object to be added to the scene} object 
 * @purpose - Helper function for adding a new object to the scene and refreshing the GUI
 */
function addObjectToScene(state, object) {
    object.name = object.name;
    state.objects.push(object);
}

/**
 * 
 * @param {gl context} gl 
 * @param {object - object containing scene values} state 
 * @purpose - Calls the drawscene per frame
 */
function startRendering(gl, state, initialView) {
    // A variable for keeping track of time between frames
    var then = 0.0;
    const player = getObject(state, "player");

    function resetGame() {
        state.objects.forEach(object => {
            if (object.collider) {
                object.collider.hit = false;
            }
            object.model.scale = JSON.parse(JSON.stringify(object.initialTransform.scale));
            object.model.rotation = JSON.parse(JSON.stringify(object.initialTransform.rotation));
            object.model.position = JSON.parse(JSON.stringify(object.initialTransform.position));
        })
        state.settings.camera = JSON.parse(JSON.stringify(initialView));
        state.camera = state.settings.camera;
        state.reset = 0;
        state.coins = 0;
        state.gameOver = false;
        state.gameStart = true;
        let element = document.querySelector('#gameOver');
        if (element) {
            let hidden = element.getAttribute("hidden");
            if (!hidden) {
                element.setAttribute("hidden", "hidden");
            }
        }
    }

    function pauseGame() {
        state.gameStart = false;
        // make player unable to move
        for (let i=0; i < 4; i++) {
            player.collider.shouldMove[i] = false;
        }
    }

    // This function is called when we want to render a frame to the canvas
    function render(now) {
        // Prompt this at start of game
        if (then == 0.0 && state.gameStart == false) {
            pauseGame();
            document.addEventListener("keydown", (event) => {
                event.preventDefault();
                switch (event.code) {
                    case ("Space"):
                        let element = document.querySelector('#gameStart');
                        if (element) {
                            element.remove();
                        }
                        // start game
                        state.gameStart = true;
                        for (let i=0; i < 4; i++) {
                            player.collider.shouldMove[i] = true;
                        }
                        break;
                    default:
                        break;
                }                
            })
        }
        now *= 0.001; // convert to seconds
        const deltaTime = now - then;
        then = now;

        let element = document.querySelector('#coinCount');
        element.innerHTML = state.coins;

        state.deltaTime = deltaTime;
        drawScene(gl, deltaTime, state);
        game.onUpdate(deltaTime); //constantly call our game loop

         // if game conditions are met and it's game over
         if (state.gameOver == true) {
            state.reset = 1;
            pauseGame();
            document.addEventListener("keydown", (event) => {
                event.preventDefault();
                switch (event.code) {
                    case ("Space"):
                        //if player wants to restart game, reset objects
                        resetGame();
                        break;
                    default:
                        break;
                }                
            })
        }

        // Request another frame when this one is done
        requestAnimationFrame(render);
    }
    // Draw the scene
    requestAnimationFrame(render);
}

/**
 * 
 * @param {gl context} gl 
 * @param {float - time from now-last} deltaTime 
 * @param {object - contains the state for the scene} state 
 * @purpose Iterate through game objects and render the objects aswell as update uniforms
 */
function drawScene(gl, deltaTime, state) {
    gl.clearColor(state.settings.backgroundColor[0], state.settings.backgroundColor[1], state.settings.backgroundColor[2], 1.0); // Here we are drawing the background color that is saved in our state
    gl.enable(gl.DEPTH_TEST); // Enable depth testing
    gl.depthFunc(gl.LEQUAL); // Near things obscure far things
    gl.enable(gl.CULL_FACE); // Cull the backface of our objects to be more efficient
    gl.cullFace(gl.BACK);
    // gl.frontFace(gl.CCW);
    gl.clearDepth(1.0); // Clear everything
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    let camera = state.camera[0];
    if (state.mode === 1) {
        camera = state.camera[1];
    }
    // sort objects by nearness to camera
    let sorted = state.objects.sort((a, b) => {
        let aCentroidFour = vec4.fromValues(a.centroid[0], a.centroid[1], a.centroid[2], 1.0);
        vec4.transformMat4(aCentroidFour, aCentroidFour, a.modelMatrix);

        let bCentroidFour = vec4.fromValues(b.centroid[0], b.centroid[1], b.centroid[2], 1.0);
        vec4.transformMat4(bCentroidFour, bCentroidFour, b.modelMatrix);

        return vec3.distance(camera.position, vec3.fromValues(aCentroidFour[0], aCentroidFour[1], aCentroidFour[2]))
            >= vec3.distance(camera.position, vec3.fromValues(bCentroidFour[0], bCentroidFour[1], bCentroidFour[2])) ? -1 : 1;
    });

    // iterate over each object and render them
    sorted.map((object) => {
        gl.useProgram(object.programInfo.program);
        {

            if (object.material.alpha < 1.0) {
                // TODO turn off depth masking
                gl.depthMask(false);
                // enable blending and specify blending function 
                gl.enable(gl.BLEND);
                gl.blendFunc(gl.ONE_MINUS_CONSTANT_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
                // clear depth for correct transparency rendering 
                gl.clear(gl.DEPTH_BUFFER_BIT);
                
            }
            else {
                // TODO disable blending 
                gl.disable(gl.BLEND);
                // enable depth masking and z-buffering
                gl.depthMask(true);
                gl.enable(gl.DEPTH_TEST); //enable depth testing
                // specify depth function
                gl.depthFunc(gl.LEQUAL);
                // clear depth with 1.0
                gl.clearDepth(1.0);
            }

            // Projection Matrix ....
            let projectionMatrix = mat4.create();
            let fovy = 90.0 * Math.PI / 180.0; // Vertical field of view in radians
            let aspect = state.canvas.clientWidth / state.canvas.clientHeight; // Aspect ratio of the canvas
            let near = 0.1; // Near clipping plane
            let far = 1000000.0; // Far clipping plane

            mat4.perspective(projectionMatrix, fovy, aspect, near, far);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.projection, false, projectionMatrix);
            state.projectionMatrix = projectionMatrix;

            // View Matrix & Camera ....
            let viewMatrix = mat4.create();
            let camFront = vec3.fromValues(0, 0, 0);
            vec3.add(camFront, camera.position, camera.front);
            mat4.lookAt(
                viewMatrix,
                camera.position,
                camFront,
                camera.up,
            );
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.view, false, viewMatrix);
            gl.uniform3fv(object.programInfo.uniformLocations.cameraPosition, camera.position);
            state.viewMatrix = viewMatrix;

            // Model Matrix ....
            let modelMatrix = mat4.create();
            let negCentroid = vec3.fromValues(0.0, 0.0, 0.0);
            vec3.negate(negCentroid, object.centroid);
            mat4.translate(modelMatrix, modelMatrix, object.model.position);
            mat4.translate(modelMatrix, modelMatrix, object.centroid);
            mat4.mul(modelMatrix, modelMatrix, object.model.rotation);
            mat4.scale(modelMatrix, modelMatrix, object.model.scale);
            mat4.translate(modelMatrix, modelMatrix, negCentroid);

            if (object.parent) {
                let parent = getObject(state, object.parent);
                if (parent.model && parent.model.modelMatrix) {
                    mat4.multiply(modelMatrix, parent.model.modelMatrix, modelMatrix);
                }
            }

            object.model.modelMatrix = modelMatrix;
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.model, false, modelMatrix);

            // Normal Matrix ....
            let normalMatrix = mat4.create();
            mat4.invert(normalMatrix, modelMatrix);
            mat4.transpose(normalMatrix, normalMatrix);
            gl.uniformMatrix4fv(object.programInfo.uniformLocations.normalMatrix, false, normalMatrix);

            // Object material
            gl.uniform3fv(object.programInfo.uniformLocations.diffuseVal, object.material.diffuse);
            gl.uniform3fv(object.programInfo.uniformLocations.ambientVal, object.material.ambient);
            gl.uniform3fv(object.programInfo.uniformLocations.specularVal, object.material.specular);
            gl.uniform1f(object.programInfo.uniformLocations.nVal, object.material.n);
            gl.uniform1f(object.programInfo.uniformLocations.alpha, object.material.alpha);

            //let mainLight = state.pointLights[2];

            // Light Properties
            gl.uniform1i(object.programInfo.uniformLocations.numLights, state.numLights);
            if (state.pointLights.length > 0) {
                for (let i = 0; i < state.pointLights.length; i++) {
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].position'), state.pointLights[i].position);
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].colour'), state.pointLights[i].colour);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].strength'), state.pointLights[i].strength);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].linear'), state.pointLights[i].linear);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'pointLights[' + i + '].quadratic'), state.pointLights[i].quadratic);
                }
            }
            gl.uniform1i(object.programInfo.uniformLocations.numDirLights, state.numDirLights);
            if (state.numDirLights.length > 0) {
                for (let i = 0; i < state.numDirLights.length; i++) {
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'dirLights[' + i + '].position'), state.dirLights[i].position);
                    gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'dirLights[' + i + '].colour'), state.dirLights[i].colour);
                    gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'dirLights[' + i + '].direction'), state.dirLights[i].direction);
                }
            }
            // gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'mainLight.position'), mainLight.position);
            // gl.uniform3fv(gl.getUniformLocation(object.programInfo.program, 'mainLight.colour'), mainLight.colour);
            // gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'mainLight.strength'), mainLight.strength);
            // gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'mainLight.constant'), mainLight.constant);
            // gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'mainLight.linear'), mainLight.linear);
            // gl.uniform1f(gl.getUniformLocation(object.programInfo.program, 'mainLight.quadratic'), mainLight.quadratic);


            {
                // Bind the buffer we want to draw
                gl.bindVertexArray(object.buffers.vao);

                //check for diffuse texture and apply it
                if (object.material.shaderType === 3 || object.material.shaderType === 1) {
                    state.samplerExists = 1;
                    gl.activeTexture(gl.TEXTURE0);
                    gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                    gl.uniform1i(object.programInfo.uniformLocations.sampler, object.model.texture);
                    gl.bindTexture(gl.TEXTURE_2D, object.model.texture);
                }
                else {
                    gl.activeTexture(gl.TEXTURE0);
                    state.samplerExists = 0;
                    gl.uniform1i(object.programInfo.uniformLocations.samplerExists, state.samplerExists);
                }

                //check for normal texture and apply it
                if (object.material.shaderType === 4) {
                    state.samplerNormExists = 1;
                    gl.activeTexture(gl.TEXTURE1);
                    gl.uniform1i(object.programInfo.uniformLocations.normalSamplerExists, state.samplerNormExists);
                    gl.uniform1i(object.programInfo.uniformLocations.normalSampler, 1);
                    gl.bindTexture(gl.TEXTURE_2D, object.model.textureNorm);
                } else {
                    gl.activeTexture(gl.TEXTURE1);
                    state.samplerNormExists = 0;
                    gl.uniform1i(object.programInfo.uniformLocations.normalSamplerExists, state.samplerNormExists);
                }

                // Draw the object
                const offset = 0; // Number of elements to skip before starting

                //if its a mesh then we don't use an index buffer and use drawArrays instead of drawElements
                if (((object.type === "mesh" || object.type === "meshCustom") && (object.collider ? object.collider.hit == false : true)) || object.name.includes("player")) {
                    gl.drawArrays(gl.TRIANGLES, offset, object.buffers.numVertices / 3);
                } else {
                    gl.drawElements(gl.TRIANGLES, object.buffers.numVertices, gl.UNSIGNED_SHORT, offset);
                }
            }
        }
    });
}
