import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import type { Die } from '../lib/chinchiro';

export interface DiceSceneHandle {
  roll: (dice: [Die, Die]) => Promise<void>;
}

interface Props {
  onClack: () => void;
  reducedMotion: boolean;
}

const FACE_LOCAL_DIRECTIONS: Record<Die, THREE.Vector3> = {
  1: new THREE.Vector3(0, 1, 0),
  2: new THREE.Vector3(0, 0, 1),
  3: new THREE.Vector3(1, 0, 0),
  4: new THREE.Vector3(-1, 0, 0),
  5: new THREE.Vector3(0, 0, -1),
  6: new THREE.Vector3(0, -1, 0),
};
const UP = new THREE.Vector3(0, 1, 0);
const SIZE = 1.05;
const HALF = SIZE / 2;

function pipPattern(n: number): [number, number][] {
  const a = 0.245;
  const corners: [number, number][] = [[-a, a], [a, -a]];
  if (n === 1) return [[0, 0]];
  if (n === 2) return corners;
  if (n === 3) return [...corners, [0, 0]];
  if (n === 4) return [[-a, a], [a, a], [-a, -a], [a, -a]];
  if (n === 5) return [[-a, a], [a, a], [0, 0], [-a, -a], [a, -a]];
  return [[-a, a], [a, a], [-a, 0], [a, 0], [-a, -a], [a, -a]];
}

function faceTexture(value: Die, character: '山' | '田') {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fffdf4';
  ctx.fillRect(0, 0, 256, 256);
  if (value === 1) {
    ctx.fillStyle = '#d13225';
    ctx.font = '900 196px "Dela Gothic Local", "Zen Kaku Gothic New", sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(character, 128, 143);
  } else {
    ctx.fillStyle = '#171b22';
    for (const [x, y] of pipPattern(value)) {
      ctx.beginPath(); ctx.arc(128 + x * 256, 128 + y * 256, 24, 0, Math.PI * 2); ctx.fill();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createDie(character: '山' | '田') {
  const faceValues: Die[] = [3, 4, 1, 6, 2, 5];
  const materials = faceValues.map(value => new THREE.MeshStandardMaterial({
    map: faceTexture(value, character), roughness: 0.26, metalness: 0.015,
  }));
  const die = new THREE.Mesh(new THREE.BoxGeometry(SIZE, SIZE, SIZE, 3, 3, 3), materials);
  die.castShadow = true; die.receiveShadow = true;
  return die;
}

export default forwardRef<DiceSceneHandle, Props>(function DiceScene({ onClack, reducedMotion }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const callbacks = useRef({ onClack, reducedMotion });
  callbacks.current = { onClack, reducedMotion };

  const engine = useRef<{ roll: (dice: [Die, Die]) => Promise<void> } | null>(null);

  useImperativeHandle(ref, () => ({
    roll: dice => engine.current?.roll(dice) ?? Promise.resolve(),
  }), []);

  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
    camera.position.set(0, 6.4, 8.4);
    camera.lookAt(0, 0.25, 0);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute('aria-hidden', 'true');

    scene.add(new THREE.HemisphereLight('#fff4df', '#a54a36', 2.6));
    const key = new THREE.DirectionalLight('#fff5e3', 4);
    key.position.set(-3, 7, 5); key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = key.shadow.camera.bottom = -4;
    key.shadow.camera.right = key.shadow.camera.top = 4;
    key.shadow.bias = -0.0007;
    scene.add(key);
    const rim = new THREE.DirectionalLight('#ffc779', 2.3);
    rim.position.set(5, 3, -4); scene.add(rim);

    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ color: '#5b2216', opacity: 0.22 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.29; ground.receiveShadow = true;
    scene.add(ground);
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64), new THREE.MeshBasicMaterial({ color: '#532b22', transparent: true, opacity: 0.09, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -0.27; shadow.scale.y = 0.65; scene.add(shadow);

    const profile = [
      [0, -0.14], [1.4, -0.14], [1.62, -0.06], [1.98, 0.12],
      [2.48, 0.54], [2.85, 1.06], [2.91, 1.19], [2.88, 1.27],
      [2.78, 1.31], [2.68, 1.27], [2.64, 1.16], [2.30, 0.65],
      [1.89, 0.25], [1.52, 0.08], [0, 0.08],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const bowl = new THREE.Mesh(new THREE.LatheGeometry(profile, 96), new THREE.MeshPhysicalMaterial({
      color: '#993523', roughness: 0.25, metalness: 0.02, clearcoat: 0.9, clearcoatRoughness: 0.2,
      side: THREE.DoubleSide, forceSinglePass: true,
    }));
    bowl.castShadow = true; bowl.receiveShadow = true; scene.add(bowl);
    const innerProfile = [[0, 0.095], [1.45, 0.095], [1.87, 0.26], [2.27, 0.66], [2.62, 1.19]].map(([x, y]) => new THREE.Vector2(x, y));
    const inner = new THREE.Mesh(new THREE.LatheGeometry(innerProfile, 96), new THREE.MeshStandardMaterial({ color: '#eddcb9', roughness: 0.52, side: THREE.DoubleSide }));
    inner.receiveShadow = true; scene.add(inner);
    const rimMesh = new THREE.Mesh(new THREE.TorusGeometry(2.80, 0.11, 20, 96), new THREE.MeshPhysicalMaterial({ color: '#70291f', roughness: 0.2, clearcoat: 1 }));
    rimMesh.rotation.x = Math.PI / 2; rimMesh.position.y = 1.24; scene.add(rimMesh);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(1.28, 1.38, 0.20, 64), new THREE.MeshStandardMaterial({ color: '#63291e', roughness: 0.4 }));
    foot.position.y = -0.18; foot.castShadow = true; scene.add(foot);

    const meshes = [createDie('山'), createDie('田')];
    document.body.dataset.sceneReady = 'true';
    scene.add(...meshes);

    const world = new CANNON.World({ gravity: new CANNON.Vec3(0, -16, 0) });
    world.allowSleep = true;
    const diceMaterial = new CANNON.Material('dice');
    const bowlMaterial = new CANNON.Material('bowl');
    world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, diceMaterial, { friction: 0.24, restitution: 0.48 }));
    world.addContactMaterial(new CANNON.ContactMaterial(diceMaterial, bowlMaterial, { friction: 0.38, restitution: 0.40 }));
    const defaultOrientation = new THREE.Quaternion();
    const bodies = meshes.map((mesh, index) => {
      const body = new CANNON.Body({ mass: 1, shape: new CANNON.Box(new CANNON.Vec3(HALF, HALF, HALF)), material: diceMaterial, linearDamping: 0.3, angularDamping: 0.25 });
      body.position.set(index === 0 ? -0.63 : 0.63, 0.64, index === 0 ? 0.17 : -0.15);
      world.addBody(body);
      mesh.position.copy(body.position as unknown as THREE.Vector3);
      body.addEventListener('collide', (event: { contact: CANNON.ContactEquation }) => {
        const impact = event.contact.getImpactVelocityAlongNormal();
        if (Math.abs(impact) > 1.7) callbacks.current.onClack();
      });
      return body;
    });
    const floor = new CANNON.Body({ mass: 0, material: bowlMaterial, shape: new CANNON.Plane() });
    floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0); floor.position.y = 0.095; world.addBody(floor);
    // A faceted, sloping bowl collider catches bouncing dice without a heavyweight mesh solver.
    for (let i = 0; i < 16; i++) {
      const angle = i / 16 * Math.PI * 2;
      const wall = new CANNON.Body({ mass: 0, material: bowlMaterial, shape: new CANNON.Box(new CANNON.Vec3(0.6, 0.75, 0.15)) });
      wall.position.set(Math.sin(angle) * 2.47, 0.68, Math.cos(angle) * 2.47);
      wall.quaternion.setFromEuler(-0.42, angle, 0, 'YXZ');
      world.addBody(wall);
    }

    let active = false;
    let elapsed = 0;
    let lastTime = performance.now();
    let resolveRoll: (() => void) | undefined;
    const targets: THREE.Quaternion[] = [defaultOrientation, defaultOrientation];
    const reduced = () => callbacks.current.reducedMotion;
    let raf = 0;
    let documentVisible = true;
    let needsRender = true;

    function finish() {
      active = false;
      bodies.forEach((body, i) => {
        const x = i === 0 ? -0.63 : 0.63;
        const z = i === 0 ? 0.17 : -0.15;
        body.position.set(x, 0.64, z); body.velocity.setZero(); body.angularVelocity.setZero();
        body.quaternion.set(targets[i].x, targets[i].y, targets[i].z, targets[i].w);
        body.sleep();
      });
      resolveRoll?.(); resolveRoll = undefined;
    }

    function animate(now: number) {
      raf = requestAnimationFrame(animate);
      const delta = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      if (!documentVisible) return;
      if (active) {
        elapsed += delta;
        if (!reduced() && elapsed < 1.8) {
          world.step(1 / 60, delta, 3);
        } else if (!reduced()) {
          world.step(1 / 60, delta, 1);
          const mix = Math.min(1, delta * 12);
          bodies.forEach((body, i) => {
            const target = new CANNON.Quaternion(targets[i].x, targets[i].y, targets[i].z, targets[i].w);
            body.quaternion = body.quaternion.slerp(target, mix);
            body.velocity.scale(0.80, body.velocity);
            body.angularVelocity.scale(0.75, body.angularVelocity);
            body.position.x += ((i === 0 ? -0.63 : 0.63) - body.position.x) * mix * 0.55;
            body.position.z += ((i === 0 ? 0.17 : -0.15) - body.position.z) * mix * 0.55;
          });
        } else {
          bodies.forEach((body, i) => {
            const q = new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w);
            q.slerp(targets[i], 0.28);
            body.quaternion.set(q.x, q.y, q.z, q.w);
          });
        }
        if (elapsed >= (reduced() ? 0.38 : 2.8)) finish();
      }
      if (needsRender || active) meshes.forEach((mesh, i) => {
        mesh.position.copy(bodies[i].position as unknown as THREE.Vector3);
        mesh.quaternion.copy(bodies[i].quaternion as unknown as THREE.Quaternion);
      });
      if (needsRender || active) {
        renderer.render(scene, camera);
        needsRender = false;
      }
    }
    raf = requestAnimationFrame(animate);

    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      if (width === 0 || height === 0) return;
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      needsRender = true;
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    const onVisibility = () => { documentVisible = !document.hidden; lastTime = performance.now(); };
    document.addEventListener('visibilitychange', onVisibility);

    engine.current = {
      roll: dice => {
        if (active) return Promise.resolve();
        active = true; elapsed = 0; needsRender = true;
        meshes.forEach((_, i) => targets[i] = new THREE.Quaternion().setFromUnitVectors(FACE_LOCAL_DIRECTIONS[dice[i]], UP));
        bodies.forEach((body, i) => {
          body.wakeUp();
          if (reduced()) { body.position.set(i === 0 ? -0.63 : 0.63, 0.64, i === 0 ? 0.17 : -0.15); return; }
          body.position.set(i === 0 ? -0.8 : 0.8, 3.0 + Math.random() * 0.6, (Math.random() - 0.5) * 0.7);
          body.quaternion.setFromEuler(Math.random() * 5, Math.random() * 5, Math.random() * 5);
          body.velocity.set((i === 0 ? 1 : -1) * 1.1, 1.0, (Math.random() - 0.5) * 2);
          body.angularVelocity.set(8 + Math.random() * 6, 9 + Math.random() * 6, 7 + Math.random() * 6);
        });
        return new Promise<void>(resolve => {
          resolveRoll = resolve;
        });
      },
    };

    return () => {
      cancelAnimationFrame(raf); observer.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      engine.current = null; resolveRoll?.();
      meshes.forEach(mesh => {
        mesh.geometry.dispose();
        (mesh.material as THREE.MeshStandardMaterial[]).forEach(m => { m.map?.dispose(); m.dispose(); });
      });
      scene.traverse(object => {
        if (object instanceof THREE.Mesh && !(meshes as THREE.Mesh[]).includes(object)) {
          object.geometry.dispose();
          (Array.isArray(object.material) ? object.material : [object.material]).forEach(m => m.dispose());
        }
      });
      renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="dice-scene" />;
});

