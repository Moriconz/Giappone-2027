// ============================================================================
// AVATAR-RENDERER.JS — scena Three.js unica per l'avatar voxel (V2 F2).
// Riusata da: creator, profilo (F6), classifica (F5). Lazy: three.min.js
// (vendor r147 UMD, offline) caricato solo alla prima mount, mai all'avvio.
// InstancedMesh unico + luce fissa stilizzata, niente ombre (style-bible).
// API: AvatarRenderer.mount(container, avatar?) → handle { setAvatar, fps, dispose }
// ============================================================================
(function () {
  'use strict';

  const THREE_SRC = './vendor/three/three.min.js';

  async function mount(container, avatar) {
    await window.loadScript(THREE_SRC);
    await window.AvatarParts.load();
    const THREE = window.THREE;

    const W = container.clientWidth || 300, H = container.clientHeight || 340;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(W, H);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, W / H, 0.1, 200);
    camera.position.set(0, 16, 52);
    camera.lookAt(0, 12, 0);

    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const sun = new THREE.DirectionalLight(0xffffff, 0.6);
    sun.position.set(20, 40, 30);
    scene.add(sun);

    const group = new THREE.Group();
    scene.add(group);

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial();
    let mesh = null;

    function setAvatar(av) {
      if (mesh) { group.remove(mesh); mesh.dispose(); }
      const cells = window.AvatarParts.compose(av);
      mesh = new THREE.InstancedMesh(geo, mat, cells.size);
      const m = new THREE.Matrix4(), color = new THREE.Color();
      let i = 0;
      cells.forEach((hex, key) => {
        const [x, y, z] = key.split(',').map(Number);
        m.setPosition(x, y + 0.5, z);
        mesh.setMatrixAt(i, m);
        mesh.setColorAt(i, color.set(hex));
        i++;
      });
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
      group.add(mesh);
    }
    setAvatar(avatar || window.AvatarParts.defaultAvatar());

    // Rotazione col dito/mouse (niente OrbitControls: 15 righe bastano)
    let dragging = false, px = 0, py = 0;
    const el = renderer.domElement;
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => { dragging = true; px = e.clientX; py = e.clientY; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => {
      if (!dragging) return;
      group.rotation.y += (e.clientX - px) * 0.012;
      group.rotation.x = Math.max(-0.35, Math.min(0.35, group.rotation.x + (e.clientY - py) * 0.006));
      px = e.clientX; py = e.clientY;
    });
    el.addEventListener('pointerup', () => { dragging = false; });
    el.addEventListener('pointercancel', () => { dragging = false; });

    let disposed = false, frames = 0, fpsStart = performance.now();
    function loop() {
      if (disposed) return;
      if (!dragging) group.rotation.y += 0.004; // idle spin lento
      renderer.render(scene, camera);
      frames++;
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    return {
      setAvatar,
      // fps misurati dall'inizio vita del renderer (per gate 60fps / debug)
      fps: () => Math.round(frames / ((performance.now() - fpsStart) / 1000)),
      resetFps: () => { frames = 0; fpsStart = performance.now(); },
      dispose() {
        disposed = true;
        if (mesh) mesh.dispose();
        geo.dispose(); mat.dispose();
        renderer.dispose();
        el.remove();
      }
    };
  }

  window.AvatarRenderer = { mount };
})();
