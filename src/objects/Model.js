class Model extends RenderObject {
    constructor(glContext, object, meshDetails, materialDetails) {
        super(glContext, object);
        this.type = "mesh";

        this.model = { ...this.model, 
            normals: meshDetails.normals,
            vertices: meshDetails.vertices,
            uvs: meshDetails.uvs,
        }

        this.material = { ...this.material,
            diffuse: materialDetails != null ? materialDetails.diffuse : object.material.diffuse,
            ambient: materialDetails != null ? materialDetails.ambient : object.material.ambient,
            specular: materialDetails != null ? materialDetails.specular : object.material.specular,
            alpha: materialDetails != null ? materialDetails.opacity : object.material.alpha,
            n: materialDetails != null ? materialDetails.shininess : object.material.n,
        }
        this.front = object.front;
    }

    async setup() {
        this.centroid = await asyncCalcCentroid(this.model.vertices);
        this.lightingShader();
        this.scale(this.initialTransform.scale);
        this.translate(this.initialTransform.position);
        this.model.rotation = this.initialTransform.rotation;
        this.initBuffers();
    }

    initBuffers() {
        //create vertices, normal and indicies arrays
        const positions = new Float32Array(this.model.vertices);
        const normals = new Float32Array(this.model.normals);
        const textureCoords = new Float32Array(this.model.uvs);
        var vertexArrayObject = this.gl.createVertexArray();
        this.gl.bindVertexArray(vertexArrayObject);

        this.buffers = {
            vao: vertexArrayObject,
            attributes: {
                position: initPositionAttribute(this.gl, this.programInfo, positions),
                normal: initNormalAttribute(this.gl, this.programInfo, normals),
                uv: initTextureCoords(this.gl, this.programInfo, textureCoords),
            },
            numVertices: positions.length
        }

    }
}
