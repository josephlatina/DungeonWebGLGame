class Game {
    constructor(state) {
        this.state = state;
        this.spawnedObjects = [];
        this.collidableObjects = [];
        this.camera = this.state.mode == 0 ? this.state.settings.camera[0] : this.state.settings.camera[1];
    }

    // example - we can add our own custom method to our game and call it using 'this.customMethod()'
    customMethod() {
        console.log("Custom method!");
    }

    // example - create a collider on our object with various fields we might need (you will likely need to add/remove/edit how this works)
    createSphereCollider(object, radius, onCollide = null) {
        object.collider = {
            type: "SPHERE",
            radius: radius,
            shouldMove: [true, true, true, true],
            hit: false,
            onCollide: onCollide ? onCollide : (otherObject) => {
                console.log(`Collided with ${otherObject.name}`);
            }
        };
        this.collidableObjects.push(object);
    }

    createCoinSphereCollider(object, radius, onCollide = null) {
        object.collider = {
            type: "SPHERE",
            radius: radius,
            shouldMove: [true, true, true, true],
            hit: false,
            onCollide: onCollide ? onCollide : (otherObject) => {
                if (object.collider.hit == false) {
                    this.state.coins += 1;
                }
                object.collider.hit = true;
                for (let i=0; i < 4; i++) {
                    this.player.collider.shouldMove[i] = true;
                }            }
        };
        this.collidableObjects.push(object);
    }


    createBoxCollider(object, onCollide = null) {
        object.collider = {
            type: "BOX",
            minX: Math.abs(Math.round(object.model.rotation[0])) == 1 ? object.model.position[0] - (0.5)*object.model.scale[0]/2 - 0.25 : object.model.position[0] - (0.5)*object.model.scale[2]/2 - 0.25,
            maxX: Math.abs(Math.round(object.model.rotation[0])) == 1 ? object.model.position[0] + (0.5)*object.model.scale[0]/2 + 0.25 : object.model.position[0] + (0.5)*object.model.scale[2]/2 + 0.25,
            minZ: Math.abs(Math.round(object.model.rotation[0])) == 1 ? object.model.position[2] - (0.5)*object.model.scale[2]/2 - 0.25 : object.model.position[2] - (0.5)*object.model.scale[0]/2 - 0.25,
            maxZ: Math.abs(Math.round(object.model.rotation[0])) == 1 ? object.model.position[2] + (0.5)*object.model.scale[2]/2 + 0.25 : object.model.position[2] + (0.5)*object.model.scale[0]/2 + 0.25,
            hit: false,
            onCollide: onCollide ? onCollide : (otherObject) => {
                console.log(`Collided with ${otherObject.name}`);
            }
        };
        this.collidableObjects.push(object);
    }

    createInteriorBoxCollider(object, onCollide = null) {
        object.collider = {
            type: "BOX",
            minX: Math.abs(Math.round(object.model.rotation[0])) == 1 ? object.model.position[0] + 5 - object.model.scale[0]*11.9 : object.model.position[0] - (0.8)*object.model.scale[0],
            maxX: Math.abs(Math.round(object.model.rotation[0])) == 1 ? object.model.position[0] + 5 + object.model.scale[0]*11.9 : object.model.position[0] + (0.8)*object.model.scale[0],
            minZ: Math.abs(Math.round(object.model.rotation[0])) == 1 ? object.model.position[2] - (0.8)*object.model.scale[2] : object.model.position[2] + 5 - object.model.scale[2]*20,
            maxZ: Math.abs(Math.round(object.model.rotation[0])) == 1 ? object.model.position[2] + (0.8)*object.model.scale[2] : object.model.position[2] + 5+ object.model.scale[2]*20,
            hit: false,
            onCollide: onCollide ? onCollide : (otherObject) => {
                console.log(`Collided with ${otherObject.name}`);
            }
        };
        this.collidableObjects.push(object);
    }

    // example - function to check if an object is colliding with collidable objects
    checkCollision(object) {
        //object should be able to move right if collision is not detected
        for (let i=0; i < 4; i++) {
            object.collider.shouldMove[i] = true;
        }
        // loop over all the other collidable objects 
        this.collidableObjects.forEach(otherObject => {
            // do a check to see if we have collided, if we have we can call object.onCollide(otherObject) which will
            // call the onCollide we define for that specific object. This way we can handle collisions identically for all
            // objects that can collide but they can do different things (ie. player colliding vs projectile colliding)
            // use the modeling transformation for object and otherObject to transform position into current location
            if (object != otherObject && otherObject.collider.type == "SPHERE") {
                const distance = Math.sqrt(
                    (object.model.position[0] - otherObject.model.position[0]) * (object.model.position[0] - otherObject.model.position[0]) +
                    (object.model.position[2] - otherObject.model.position[2]) * (object.model.position[2] - otherObject.model.position[2])
                );

                if (distance < object.collider.radius + otherObject.collider.radius) {
                    object.collider.onCollide(otherObject);
                    otherObject.collider.onCollide(object);
                }
            }

            if (object != otherObject && otherObject.collider.type == "BOX") {
                const x = Math.max(otherObject.collider.minX, Math.min(object.model.position[0], otherObject.collider.maxX));
                const z = Math.max(otherObject.collider.minZ, Math.min(object.model.position[2], otherObject.collider.maxZ));

                const distance = Math.sqrt(
                    (x - object.model.position[0]) * (x - object.model.position[0]) +
                    (z - object.model.position[2]) * (z - object.model.position[2])
                );

                if (distance < object.collider.radius) {
                    const xDist = x - object.model.position[0];
                    const zDist = z - object.model.position[2];
                    if (xDist < object.collider.radius && xDist > 0) {
                        object.collider.shouldMove[0] = false;
                    }
                    if (xDist < object.collider.radius && xDist < 0) {
                        object.collider.shouldMove[1] = false;
                    }
                    if (zDist < object.collider.radius && zDist > 0) {
                        object.collider.shouldMove[2] = false;
                    }
                    if (zDist < object.collider.radius && zDist < 0) {
                        object.collider.shouldMove[3] = false;
                    }
                    object.collider.onCollide(otherObject);
                    otherObject.collider.onCollide(object);
                }
            }

        });
    }

    // runs once on startup after the scene loads the objects
    async onStart() {
        console.log("On start");

        // this just prevents the context menu from popping up when you right click
        document.addEventListener("contextmenu", (e) => {
            e.preventDefault();
        }, false);

        // example - set an object in onStart before starting our render loop!
        this.player = getObject(this.state, "player");

        // example - create sphere colliders on our two objects as an example, we give 2 objects colliders otherwise
        // no collision can happen
        // create sphere collider on main player
        this.createSphereCollider(this.player, 5, (otherObject) => {
            console.log(`This is a custom collision of ${otherObject.name}`)
        });
        for (let i = 0; i < state.objects.length; i++) {
            // create sphere collider on coins
            if (state.objects[i].name.includes("Coin")) {
                state.objects[i].model.scale = [3, 3, 3];
                state.objects[i].model.position[1] = 3;
                this.createCoinSphereCollider(state.objects[i], 5);
            }
            // create sphere collider on enemies
            else if (state.objects[i].name.includes("Enemy")) {
                this.state.objects[i].model.scale = [15, 15, 15];
                this.state.objects[i].model.position[1] = 10;
                this.createSphereCollider(state.objects[i], 10, (otherObject) => {
                    for (let i=0; i < 4; i++) {
                        otherObject.collider.shouldMove[i] = false;
                    }
                    otherObject.collider.hit = true;
                })
            }
            // create box collider on interior walls
            else if (state.objects[i].name.includes("interior-wall")) {
                this.createInteriorBoxCollider(state.objects[i], (otherObject) => {
                    console.log(`This yaall is a custom collision of ${otherObject.name}`);
                });
            }
            else if (state.objects[i].name.includes("walls")) {
                this.createBoxCollider(state.objects[i], (otherObject) => {
                    console.log(`This yaall is a custom collision of ${otherObject.name}`);
                });
            }
            else {
                // create sphere collider on other objects
                this.createSphereCollider(state.objects[i], 6, (otherObject) => {
                    console.log(`This is a custom collision of ${otherObject.name}`)
                });
            }
            
        }
        // example - setting up a key press event to move an object in the scene
        document.addEventListener("keydown", (e) => {
            e.preventDefault();

            switch (e.code) {
                case "KeyZ":
                    // if in overhead view,
                    if (this.state.mode == 0) {
                        this.state.mode = 1; // change camera mode to player view
                        this.camera = this.state.camera[1]; // configure camera settings accordingly
                        // change the camera's position such that it's aligned with player's current position
                        const position = JSON.parse(JSON.stringify(this.player.model.position));
                        this.camera.position = [position[0], 25, position[2]];
                    }
                    // if in first person view,
                    else if (this.state.mode == 1) {
                        // switch this.camera mode
                        this.state.mode = 0;
                        this.camera = this.state.camera[0];
                        // change camera's position accordingly
                        const position = JSON.parse(JSON.stringify(this.player.model.position));
                        this.camera.position = [position[0], 80, position[2]];
                    }
                    break;
                case "KeyA":
                    if (this.state.mode == 1) {
                        //this.cube.translate(vec3.fromValues(0.5, 0, 0));
                        // Rotate this.camera around Y
                        var correctDelta = vec3.create();
                        vec3.scale(correctDelta, this.camera.right, -5); // correctDelta = e . right 
                        vec3.add(this.camera.front, this.camera.front, correctDelta); // front + correctDelta
                        // update at, right
                        vec3.sub(this.camera.at, this.camera.front, this.camera.position); // at = front - position
                        vec3.normalize(this.camera.at, this.camera.at); // normalize at
                        vec3.cross(this.camera.right, this.camera.at, this.camera.up); // right = at x up
                    }
                    break;

                case "KeyD":
                    if (this.state.mode == 1) {
                        //this.cube.translate(vec3.fromValues(-0.5, 0, 0));
                        // Rotate this.camera around Y
                        var correctDelta = vec3.create();
                        vec3.scale(correctDelta, this.camera.right, 5); // correctDelta = e . right 
                        vec3.add(this.camera.front, this.camera.front, correctDelta); // front + correctDelta
                        // update at, right
                        vec3.sub(this.camera.at, this.camera.front, this.camera.position); // at = front - position
                        vec3.normalize(this.camera.at, this.camera.at); // normalize at
                        vec3.cross(this.camera.right, this.camera.at, this.camera.up); // right = at x up
                    }
                    break;

                case "ArrowUp":
                    this.player.collider.onCollide = (otherObject) => {
                        this.player.collider.shouldMove[0] = false;
                    }
                    if (this.player.collider.shouldMove[0]) {
                        if (this.state.mode == 1) {
                            // 1st person - translate both this.camera center and position
                            var move = vec3.create();
                            vec3.sub(this.camera.at, this.camera.front, this.camera.position);
                            vec3.normalize(this.camera.at, this.camera.at); // normalize at
                            vec3.scale(move, this.camera.at, 5);
                            vec3.add(this.camera.front, this.camera.front, move);
                            vec3.add(this.camera.position, this.camera.position, move);
                            this.player.translate(move);
                        } else {
                            // overhead view - translate position
                            vec3.add(this.state.camera[0].position, this.state.camera[0].position, vec3.fromValues(0, 0, -5));
                            // translate player
                            this.player.translate(vec3.fromValues(0, 0, -5));
                        }
                    }
                    break;

                case "ArrowDown":
                    this.player.collider.onCollide = (otherObject) => {
                        this.player.collider.shouldMove[1] = false;
                    }
                    if (this.player.collider.shouldMove[1]) {
                        if (this.state.mode == 1) {
                            // 1st person - translate both this.camera center and position
                            var move = vec3.create();
                            vec3.sub(this.camera.at, this.camera.front, this.camera.position);
                            vec3.normalize(this.camera.at, this.camera.at); // normalize at
                            vec3.scale(move, this.camera.at, -5);
                            vec3.add(this.camera.front, this.camera.front, move);
                            vec3.add(this.camera.position, this.camera.position, move);
                            this.player.translate(move);
                        } else {
                            // overhead view - translate position
                            vec3.add(this.state.camera[0].position, this.state.camera[0].position, vec3.fromValues(0, 0, 5));
                            // translate player
                            this.player.translate(vec3.fromValues(0, 0, 5));
                        }
                    }
                    break;

                case "ArrowRight":
                    this.player.collider.onCollide = (otherObject) => {
                        this.player.collider.shouldMove[2] = false;
                    }
                    if (this.player.collider.shouldMove[2]) {
                        if (this.state.mode == 1) {
                            // 1st person - translate both this.camera center and position
                            var move = vec3.create();
                            vec3.sub(this.camera.at, this.camera.front, this.camera.position);
                            vec3.normalize(this.camera.at, this.camera.at); // normalize at
                            vec3.scale(move, this.camera.right, 0.5);
                            vec3.add(this.camera.front, this.camera.front, move);
                            vec3.add(this.camera.position, this.camera.position, move);
                            this.player.translate(move);
                        } else {
                            // overhead view - translate position
                            vec3.add(this.state.camera[0].position, this.state.camera[0].position, vec3.fromValues(5, 0, 0));
                            // translate player
                            this.player.translate(vec3.fromValues(5, 0, 0));
                        }
                    }
                    break;

                case "ArrowLeft":
                    this.player.collider.onCollide = (otherObject) => {
                        this.player.collider.shouldMove[3] = false;
                    }
                    if (this.player.collider.shouldMove[3]) {
                        if (this.state.mode == 1) {
                            // 1st person - translate both this.camera center and position
                            var move = vec3.create();
                            vec3.sub(this.camera.at, this.camera.front, this.camera.position);
                            vec3.normalize(this.camera.at, this.camera.at); // normalize at
                            vec3.scale(move, this.camera.right, -0.5);
                            vec3.add(this.camera.front, this.camera.front, move);
                            vec3.add(this.camera.position, this.camera.position, move);
                            this.player.translate(move);
                        } else {
                            // overhead view - translate position
                            vec3.add(this.state.camera[0].position, this.state.camera[0].position, vec3.fromValues(-5, 0, 0));
                            // translate player
                            this.player.translate(vec3.fromValues(-5, 0, 0));
                        }
                    }
                    break;


                default:
                    break;
            }
        });

        this.customMethod(); // calling our custom method! (we could put spawning logic, collision logic etc in there ;) )

        // example: spawn some stuff before the scene starts
        // for (let i = 0; i < 10; i++) {
        //     for (let j = 0; j < 10; j++) {
        //         for (let k = 0; k < 10; k++) {
        //             spawnObject({
        //                 name: `new-Object${i}${j}${k}`,
        //                 type: "cube",
        //                 material: {
        //                     diffuse: randomVec3(0, 1)
        //                 },
        //                 position: vec3.fromValues(4 - i, 5 - j, 10 - k),
        //                 scale: vec3.fromValues(0.5, 0.5, 0.5)
        //             }, this.state);
        //         }
        //     }
        // }

        // for (let i = 0; i < 10; i++) {
        //     let tempObject = await spawnObject({
        //         name: `new-Object${i}`,
        //         type: "cube",
        //         material: {
        //             diffuse: randomVec3(0, 1)
        //         },
        //         position: vec3.fromValues(4 - i, 0, 0),
        //         scale: vec3.fromValues(0.5, 0.5, 0.5)
        //     }, this.state);


        // tempObject.constantRotate = true; // lets add a flag so we can access it later
        // this.spawnedObjects.push(tempObject); // add these to a spawned objects list

        // tempObject.collidable = true;
        // tempObject.onCollide = (object) => { // we can also set a function on an object without defining the function before hand!
        //     console.log(`I collided with ${object.name}!`);
        // };
        // }
    }

    // Runs once every frame non stop after the scene loads
    onUpdate(deltaTime) {
        // TODO - Here we can add game logic, like moving game objects, detecting collisions, you name it. Examples of functions can be found in sceneFunctions

        if (this.state.gameStart) {
            this.checkCollision(this.player);
        }


        // check for game clear conditions
        // position = (-315, -90, -160)
        if ((this.player.model.position[0] > -190 && this.state.reset == 0 && this.state.coins == 10) || this.player.collider.hit == true) {
            let element = document.querySelector('#gameOver');
            if (element) {
                let hidden = element.getAttribute("hidden");
                if (hidden) {
                    element.removeAttribute("hidden");
                }
            }
            this.state.gameOver = true;
        }
        // example: Rotate a single object we defined in our start method
        // this.cube.rotate('x', deltaTime * 0.5);

        // example: Rotate all objects in the scene marked with a flag
        // this.state.objects.forEach((object) => {
        //     if (object.constantRotate) {
        //         object.rotate('y', deltaTime * 0.5);
        //     }
        // });

        // simulate a collision between the first spawned object and 'cube' 
        // if (this.spawnedObjects[0].collidable) {
        //     this.spawnedObjects[0].onCollide(this.cube);
        // }

        // example: Rotate all the 'spawned' objects in the scene
        // this.spawnedObjects.forEach((object) => {
        //     object.rotate('y', deltaTime * 0.5);
        // });


    }
}
