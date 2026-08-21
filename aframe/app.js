// =====================================================
// OBTENER ELEMENTOS
// =====================================================

AFRAME.registerComponent("mitosis-model-position", {
    init() {
        this.el.addEventListener("model-loaded", () => {
            const model = this.el.getObject3D("mesh");
            if (!model) return;

            const bounds = new THREE.Box3().setFromObject(model);
            const center = bounds.getCenter(new THREE.Vector3());
            this.el.object3D.worldToLocal(center);
            model.position.sub(center);
        });
    }
});

AFRAME.registerComponent("mitosis-model-animation", {
    init() {
        this.mixer = null;

        this.el.addEventListener("model-loaded", (event) => {
            const model = event.detail.model || this.el.getObject3D("mesh");
            const animations = model && model.animations;

            if (!model || !animations || animations.length === 0) {
                console.warn("El modelo no contiene animaciones");
                return;
            }

            this.mixer = new THREE.AnimationMixer(model);

            animations.forEach((clip) => {
                this.mixer.clipAction(clip).play();
            });
        });
    },

    tick(time, delta) {
        if (this.mixer) {
            this.mixer.update(delta / 1000);
        }
    },

    remove() {
        if (this.mixer) {
            this.mixer.stopAllAction();
            this.mixer = null;
        }
    }
});

const botonPrueba =
    document.getElementById("botonPrueba");

const volver =
    document.getElementById("volver");

const cromosoma1 =
    document.getElementById("cromosoma1");

const cromosoma2 =
    document.getElementById("cromosoma2");

const leftController =
    document.getElementById("leftController");

const rightController =
    document.getElementById("rightController");

const objetoMovible =
    document.getElementById("objetoMovible");

const camara =
    document.querySelector("a-camera");


// =====================================================
// VARIABLES THREE.JS
// =====================================================

const mouse = new THREE.Vector2();

const raycasterMouse =
    new THREE.Raycaster();

const dragTarget =
    new THREE.Vector3();

const controllerPosition =
    new THREE.Vector3();

const objectWorldPosition =
    new THREE.Vector3();

const worldGrabOffset =
    new THREE.Vector3();

const localTarget =
    new THREE.Vector3();

const velocity =
    new THREE.Vector3();


// =====================================================
// VARIABLES DE CONTROL
// =====================================================

let objetoAgarrado = false;

let grabSource = null;

let activeController = null;

let isDragging = false;


// =====================================================
// PANEL DE DEBUG
// =====================================================

function ensureDebugPanel() {

    if (
        document.getElementById("debugText")
    ) {
        return;
    }

    const scene =
        document.querySelector("a-scene");

    if (!scene) {
        return;
    }

    const debug =
        document.createElement("a-entity");

    debug.setAttribute(
        "id",
        "debugText"
    );

    debug.setAttribute(
        "position",
        "0 1.6 -1"
    );

    debug.setAttribute(
        "rotation",
        "0 0 0"
    );

    debug.setAttribute(
        "text",
        "value:; align: left; width: 1.8; color: #FFFFFF; shader: msdf;"
    );

    scene.appendChild(debug);

    window.__debugLines = [];
}


// =====================================================
// MOSTRAR DEBUG
// =====================================================

function showDebug(msg) {

    try {

        ensureDebugPanel();

        window.__debugLines =
            window.__debugLines || [];

        const texto =
            typeof msg === "object"
                ? JSON.stringify(msg)
                : String(msg);

        window.__debugLines.push(texto);

        if (
            window.__debugLines.length > 8
        ) {

            window.__debugLines.shift();

        }

        const debug =
            document.getElementById(
                "debugText"
            );

        if (debug) {

            debug.setAttribute(
                "text",
                "value: " +
                window.__debugLines.join("\n")
            );

        }

    } catch (error) {

        console.error(error);

    }

}


// =====================================================
// MOSTRAR console.log EN VR
// =====================================================

(() => {

    const originalLog =
        console.log.bind(console);

    console.log = function (...args) {

        try {

            const texto =
                args
                    .map(
                        (argumento) =>
                            typeof argumento === "object"
                                ? JSON.stringify(argumento)
                                : String(argumento)
                    )
                    .join(" ");

            showDebug(texto);

        } catch (error) {

            // No hacer nada
        }

        originalLog(...args);

    };

})();


// =====================================================
// BOTÓN DE PRUEBA
// =====================================================

botonPrueba.addEventListener(
    "click",
    () => {

        console.log(
            "BOTÓN PRESIONADO"
        );

        botonPrueba.setAttribute(
            "color",
            "#EF4444"
        );

        const texto =
            botonPrueba.querySelector(
                "a-text"
            );

        if (texto) {

            texto.setAttribute(
                "value",
                "¡FUNCIONA!"
            );

        }

    }
);


// =====================================================
// FUNCIÓN PARA OBTENER OBJETO DEL RAYCASTER
// =====================================================

function obtenerObjetoApuntado(controller) {

    if (!controller) {

        return null;

    }

    const raycasterComponent =
        controller.components.raycaster;

    if (!raycasterComponent) {

        console.log(
            "Raycaster no encontrado"
        );

        return null;

    }

    const intersections =
        raycasterComponent.intersections;

    if (
        !intersections ||
        intersections.length === 0
    ) {

        console.log(
            "No estoy apuntando a ningún objeto"
        );

        return null;

    }

    for (
        const intersection of intersections
    ) {

        const elemento =
            intersection.el ||
            (
                intersection.object &&
                intersection.object.el
            );

        if (!elemento) {

            continue;

        }

        if (
            elemento.classList.contains(
                "grabbable"
            )
        ) {

            return {
                elemento: elemento,
                intersection: intersection
            };

        }

    }

    console.log(
        "El objeto apuntado no es agarrable"
    );

    return null;

}


// =====================================================
// AGARRAR OBJETO
// =====================================================

function agarrarObjeto(controller) {

    if (objetoAgarrado) {

        return;

    }

    const resultado =
        obtenerObjetoApuntado(
            controller
        );

    if (!resultado) {

        return;

    }

    const elemento =
        resultado.elemento;

    const intersection =
        resultado.intersection;


    console.log(
        "Objeto detectado:",
        elemento.id
    );


    // -------------------------------------------------
    // Obtener posición mundial del objeto
    // -------------------------------------------------

    objetoMovible.object3D.getWorldPosition(
        objectWorldPosition
    );


    // -------------------------------------------------
    // Obtener posición donde impactó el láser
    // -------------------------------------------------

    if (intersection.point) {

        worldGrabOffset
            .copy(objectWorldPosition)
            .sub(intersection.point);

    } else {

        worldGrabOffset.set(
            0,
            0,
            0
        );

    }


    // -------------------------------------------------
    // Guardar controlador
    // -------------------------------------------------

    activeController =
        controller;

    objetoAgarrado =
        true;

    isDragging =
        true;

    grabSource =
        "controller";


    velocity.set(
        0,
        0,
        0
    );


    console.log(
        "🔴 OBJETO AGARRADO"
    );

}


// =====================================================
// SOLTAR OBJETO
// =====================================================

function soltarObjeto(controller) {

    if (
        !objetoAgarrado
    ) {

        return;

    }

    if (
        grabSource !==
        "controller"
    ) {

        return;

    }

    if (
        activeController !==
        controller
    ) {

        return;

    }


    console.log(
        "🔴 OBJETO SOLTADO"
    );


    objetoAgarrado =
        false;

    isDragging =
        false;

    grabSource =
        null;

    activeController =
        null;

}


// =====================================================
// TRIGGER DERECHO
// =====================================================

rightController.addEventListener(
    "triggerdown",
    () => {

        console.log(
            "🎮 GATILLO DERECHO"
        );

        agarrarObjeto(
            rightController
        );

    }
);


rightController.addEventListener(
    "triggerup",
    () => {

        soltarObjeto(
            rightController
        );

    }
);


// =====================================================
// TRIGGER IZQUIERDO
// =====================================================

leftController.addEventListener(
    "triggerdown",
    () => {

        console.log(
            "🎮 GATILLO IZQUIERDO"
        );

        agarrarObjeto(
            leftController
        );

    }
);


leftController.addEventListener(
    "triggerup",
    () => {

        soltarObjeto(
            leftController
        );

    }
);


// =====================================================
// MOVIMIENTO DEL OBJETO EN VR
// =====================================================

function actualizarObjetoVR() {

    if (
        !objetoAgarrado
    ) {

        return;

    }

    if (
        grabSource !==
        "controller"
    ) {

        return;

    }

    if (
        !activeController
    ) {

        return;

    }


    // -------------------------------------------------
    // Obtener posición mundial del controlador
    // -------------------------------------------------

    activeController.object3D.getWorldPosition(
        controllerPosition
    );


    // -------------------------------------------------
    // Calcular nueva posición
    // -------------------------------------------------

    dragTarget
        .copy(controllerPosition)
        .add(worldGrabOffset);


    // -------------------------------------------------
    // Convertir posición mundial a local
    // -------------------------------------------------

    if (
        objetoMovible.object3D.parent
    ) {

        localTarget.copy(
            dragTarget
        );

        objetoMovible.object3D.parent.worldToLocal(
            localTarget
        );

    } else {

        localTarget.copy(
            dragTarget
        );

    }


    // -------------------------------------------------
    // Movimiento suave
    // -------------------------------------------------

    const currentPosition =
        objetoMovible.object3D.position;


    const smoothing =
        0.35;


    const difference =
        new THREE.Vector3()
            .subVectors(
                localTarget,
                currentPosition
            )
            .multiplyScalar(
                smoothing
            );


    velocity
        .add(difference)
        .multiplyScalar(0.75);


    currentPosition.add(
        velocity
    );

}


// =====================================================
// MOUSE - AGARRAR
// =====================================================

window.addEventListener(
    "mousedown",
    (event) => {

        if (!camara) {

            return;

        }


        mouse.x =
            (event.clientX /
                window.innerWidth) *
            2 - 1;

        mouse.y =
            -(event.clientY /
                window.innerHeight) *
            2 + 1;


        const cameraObject =
            camara.getObject3D(
                "camera"
            );


        if (!cameraObject) {

            return;

        }


        raycasterMouse.setFromCamera(
            mouse,
            cameraObject
        );


        if (
            !objetoMovible.object3D
        ) {

            return;

        }


        const intersections =
            raycasterMouse.intersectObject(
                objetoMovible.object3D,
                true
            );


        if (
            intersections.length === 0
        ) {

            return;

        }


        objetoAgarrado =
            true;

        grabSource =
            "mouse";

        isDragging =
            true;


        velocity.set(
            0,
            0,
            0
        );


        console.log(
            "🔴 ESFERA ROJA AGARRADA POR MOUSE"
        );

    }
);


// =====================================================
// MOUSE - MOVER
// =====================================================

window.addEventListener(
    "mousemove",
    (event) => {

        if (
            !objetoAgarrado ||
            grabSource !== "mouse"
        ) {

            return;

        }


        mouse.x =
            (event.clientX /
                window.innerWidth) *
            2 - 1;

        mouse.y =
            -(event.clientY /
                window.innerHeight) *
            2 + 1;

    }
);


// =====================================================
// MOUSE - SOLTAR
// =====================================================

window.addEventListener(
    "mouseup",
    () => {

        if (
            !objetoAgarrado
        ) {

            return;

        }


        console.log(
            "🔴 OBJETO SOLTADO"
        );


        objetoAgarrado =
            false;

        isDragging =
            false;

        grabSource =
            null;

        activeController =
            null;

    }
);


// =====================================================
// ACTUALIZAR OBJETO CON MOUSE
// =====================================================

function actualizarObjetoMouse() {

    if (
        !objetoAgarrado ||
        grabSource !== "mouse"
    ) {

        return;

    }


    const cameraObject =
        camara.getObject3D(
            "camera"
        );


    if (!cameraObject) {

        return;

    }


    const cameraWorldPosition =
        new THREE.Vector3();


    cameraObject.getWorldPosition(
        cameraWorldPosition
    );


    const cameraDirection =
        new THREE.Vector3();


    cameraObject.getWorldDirection(
        cameraDirection
    );


    // -------------------------------------------------
    // Distancia a la que se mantiene la esfera
    // -------------------------------------------------

    const holdDistance =
        1.2;


    dragTarget
        .copy(cameraWorldPosition)
        .add(
            cameraDirection.multiplyScalar(
                holdDistance
            )
        );


    // -------------------------------------------------
    // Convertir a posición local
    // -------------------------------------------------

    if (
        objetoMovible.object3D.parent
    ) {

        localTarget.copy(
            dragTarget
        );

        objetoMovible.object3D.parent.worldToLocal(
            localTarget
        );

    } else {

        localTarget.copy(
            dragTarget
        );

    }


    // -------------------------------------------------
    // Movimiento suave
    // -------------------------------------------------

    const currentPosition =
        objetoMovible.object3D.position;


    const smoothing =
        0.22;


    const difference =
        new THREE.Vector3()
            .subVectors(
                localTarget,
                currentPosition
            )
            .multiplyScalar(
                smoothing
            );


    velocity
        .add(difference)
        .multiplyScalar(0.85);


    currentPosition.add(
        velocity
    );

}


// =====================================================
// ACTUALIZAR OBJETO
// =====================================================

function actualizarObjeto() {

    if (
        grabSource ===
        "controller"
    ) {

        actualizarObjetoVR();

    }


    if (
        grabSource ===
        "mouse"
    ) {

        actualizarObjetoMouse();

    }

}


// =====================================================
// BOTÓN VOLVER
// =====================================================

volver.addEventListener(
    "click",
    () => {

        console.log(
            "VOLVER PRESIONADO"
        );

        window.location.href =
            "../index.html";

    }
);


// =====================================================
// LOOP PRINCIPAL
// =====================================================

function loop() {

    actualizarObjeto();

    requestAnimationFrame(
        loop
    );

}


// =====================================================
// INICIAR
// =====================================================

loop();