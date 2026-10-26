// Small hot-pink cubes floating along the left and right edges, behind the page. Pixel-unit
// orthographic camera, so sizes and positions are plain screen pixels. Each cube drifts with
// scroll at its own rate and wraps top to bottom.
import * as THREE from 'three';

const canvas = document.querySelector('[data-cubes]');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { canvas.remove(); }

if (renderer) {
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(0, 1, 0, -1, -500, 500);
  scene.add(new THREE.HemisphereLight(0xffffff, 0x5a1a38, 1.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.9);
  key.position.set(-0.4, 0.8, 1);
  scene.add(key);

  const shades = [0xf06aa5, 0xff7fb6, 0xe2508f, 0xf58cbb];
  const geo = new THREE.BoxGeometry(1, 1, 1);
  const cubes = [];
  // side, x within the edge band (0 = outer edge), y as a fraction of a viewport, size, parallax rate
  const plan = [
    ['l', 0.30, 0.18, 34, 0.25], ['l', 0.70, 0.46, 18, 0.55], ['l', 0.20, 0.78, 46, 0.15], ['l', 0.85, 1.05, 22, 0.4],
    ['l', 0.45, 1.38, 28, 0.3],
    ['r', 0.35, 0.10, 26, 0.35], ['r', 0.75, 0.36, 42, 0.18], ['r', 0.25, 0.64, 20, 0.5], ['r', 0.60, 0.92, 32, 0.28],
    ['r', 0.30, 1.25, 16, 0.6],
  ];
  plan.forEach(([side, bx, fy, size, rate], i) => {
    const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: shades[i % shades.length], roughness: 0.4, metalness: 0, emissive: 0x6a1840, transparent: true, opacity: 0.92 }));
    m.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    m.userData = { side, bx, fy, size, rate, spin: 0.15 + Math.random() * 0.25, phase: Math.random() * 6.28 };
    scene.add(m); cubes.push(m);
  });

  let W = 1, H = 1, band = 120, span = 1;
  const resize = () => {
    W = innerWidth; H = innerHeight;
    renderer.setSize(W, H, false);
    camera.left = 0; camera.right = W; camera.top = 0; camera.bottom = -H;
    camera.updateProjectionMatrix();
    // the content column is at most 1140px wide; cubes live in the gutters beside it
    const gutter = Math.max(0, (W - 1140) / 2);
    band = Math.max(46, Math.min(gutter - 10, 190));
    span = H * 1.5;
    const small = W < 760;
    cubes.forEach((c, i) => {
      c.visible = !small || i % 2 === 0;
      const s = c.userData.size * (small ? 0.6 : 1);
      c.scale.setScalar(s);
    });
  };
  addEventListener('resize', resize);
  resize();

  const clock = new THREE.Clock();
  const frame = () => {
    const t = reduce ? 0 : clock.getElapsedTime();
    const y0 = scrollY;
    for (const c of cubes) {
      const { side, bx, fy, rate, spin, phase } = c.userData;
      const x = side === 'l' ? 14 + bx * band : W - 14 - bx * band;
      // drift up with scroll at this cube's rate; wrap through a 1.5-viewport loop
      let y = (fy * H - y0 * rate) % span; if (y < -60) y += span;
      c.position.set(x, -(y + Math.sin(t * 0.6 + phase) * 8), 0);
      c.rotation.x += reduce ? 0 : 0.004 * spin * 2;
      c.rotation.y += reduce ? 0 : 0.006 * spin * 2;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };
  frame();
}
