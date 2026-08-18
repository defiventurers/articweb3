import { useEffect, useRef } from "react";
import * as THREE from "three";
import { boxAssetPath } from "./GameBox.jsx";

const TAU = Math.PI * 2;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const wrapIndex = (index, length) => (index + length) % length;

function createMaterial(color, roughness = 0.72, metalness = 0.08) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function addLine(scene, points, color, opacity = 0.34) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity });
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  return line;
}

function createAurora(scene) {
  const auroraGroup = new THREE.Group();
  const colors = [0x52f3dc, 0x72a8ff, 0xb18cff];

  for (let band = 0; band < 3; band += 1) {
    const points = [];
    for (let step = 0; step <= 34; step += 1) {
      const x = -13 + step * 0.78;
      const y = 4.9 + Math.sin(step * 0.44 + band * 1.7) * 0.62 + band * 0.18;
      points.push(new THREE.Vector3(x, y, -7.4 - band * 0.12));
    }
    auroraGroup.add(addLine(scene, points, colors[band], 0.26 - band * 0.04));
  }

  scene.add(auroraGroup);
  return auroraGroup;
}

function createSnow(scene) {
  const count = 150;
  const positions = new Float32Array(count * 3);
  for (let index = 0; index < count; index += 1) {
    positions[index * 3] = (Math.random() - 0.5) * 18;
    positions[index * 3 + 1] = Math.random() * 7 - 0.3;
    positions[index * 3 + 2] = Math.random() * 7 - 7;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xdaf8ff,
    size: 0.035,
    transparent: true,
    opacity: 0.68,
    depthWrite: false,
  });
  const snow = new THREE.Points(geometry, material);
  scene.add(snow);
  return snow;
}

function createIceStage(scene) {
  const stage = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.CircleGeometry(10.5, 64),
    new THREE.MeshStandardMaterial({ color: 0x0b263d, roughness: 0.56, metalness: 0.2 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.75;
  floor.scale.set(1.42, 0.78, 1);
  floor.receiveShadow = true;
  stage.add(floor);

  const iceRing = new THREE.Mesh(
    new THREE.RingGeometry(4.1, 4.17, 72),
    new THREE.MeshBasicMaterial({ color: 0x72eff4, transparent: true, opacity: 0.28, side: THREE.DoubleSide })
  );
  iceRing.rotation.x = -Math.PI / 2;
  iceRing.position.y = -0.72;
  stage.add(iceRing);

  const pedestal = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.9, 0.34, 48),
    new THREE.MeshStandardMaterial({ color: 0x173e56, roughness: 0.34, metalness: 0.18 })
  );
  pedestal.position.y = -0.56;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  stage.add(pedestal);

  for (let index = 0; index < 9; index += 1) {
    const angle = (index / 9) * TAU;
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(0.12 + (index % 3) * 0.035, 0.85 + (index % 2) * 0.28, 5),
      new THREE.MeshStandardMaterial({ color: index % 2 ? 0x72dbe4 : 0x7d8cff, roughness: 0.28, metalness: 0.12, transparent: true, opacity: 0.7 })
    );
    shard.position.set(Math.cos(angle) * 4.5, -0.18, Math.sin(angle) * 2.45 - 0.85);
    shard.rotation.z = Math.sin(angle) * 0.22;
    shard.castShadow = true;
    stage.add(shard);
  }

  scene.add(stage);
  return stage;
}

function createBox(game, textureLoader, onTextureLoaded) {
  // The source artwork is already a finished 3/4 product render. Keep only
  // enough depth for a physical slab and avoid a second visible box angle.
  const geometry = new THREE.BoxGeometry(1.76, 2.38, 0.1);
  const spine = createMaterial(0x081827, 0.64, 0.08);
  const top = createMaterial(0x102b40, 0.58, 0.12);
  const bottom = createMaterial(0x06121f, 0.72, 0.05);
  const front = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const materials = [spine, spine, top, bottom, front, spine];
  const mesh = new THREE.Mesh(geometry, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData.gameId = game.id;
  mesh.userData.baseMaterials = materials;
  mesh.userData.isArchiveBox = true;

  textureLoader.load(
    boxAssetPath(game.id),
    (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = 4;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      front.map = texture;
      front.color.setHex(0xffffff);
      front.needsUpdate = true;
      onTextureLoaded?.();
    },
    undefined,
    () => onTextureLoaded?.()
  );

    const edgeMaterial = new THREE.LineBasicMaterial({ color: 0x75cfd9, transparent: true, opacity: 0.2 });
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), edgeMaterial);
    mesh.add(edges);

  return mesh;
}

export function ArcticWebGLArchive({ games, selectedIndex, onSelectIndex, onReady, reducedMotion = false }) {
  const mountRef = useRef(null);
  const selectedIndexRef = useRef(selectedIndex);
  const pointerRef = useRef(null);
  const yawRef = useRef(0);

  useEffect(() => {
    selectedIndexRef.current = selectedIndex;
  }, [selectedIndex]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    let frameId;
    let disposed = false;
    const startedAt = performance.now();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x03111f);
    scene.fog = new THREE.FogExp2(0x062033, 0.055);
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0.55, 8.6);

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch (error) {
      onReady?.(false);
      return undefined;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x03111f, 1);
    mount.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D Arctic Dominion board-game archive");
    renderer.domElement.setAttribute("role", "img");
    onReady?.(true);

    const ambient = new THREE.HemisphereLight(0x8dc7e6, 0x061321, 1.4);
    scene.add(ambient);
    const moon = new THREE.DirectionalLight(0xc8edff, 2.3);
    moon.position.set(-4, 8, 5);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    scene.add(moon);
    const cyan = new THREE.PointLight(0x4cf5e4, 5.2, 11, 2);
    cyan.position.set(0, 2.6, 0.8);
    scene.add(cyan);
    const gold = new THREE.PointLight(0xf2b76b, 2.2, 8, 2);
    gold.position.set(-3.4, 0.1, 1.6);
    scene.add(gold);

    const aurora = createAurora(scene);
    const snow = createSnow(scene);
    const stage = createIceStage(scene);
    const textureLoader = new THREE.TextureLoader();
    const boxes = games.map((game) => createBox(game, textureLoader));
    boxes.forEach((box) => scene.add(box));

    function resize() {
      const bounds = mount.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.setSize(width, height, false);
    }

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(mount);

    function applyBoxTargets(elapsed) {
      boxes.forEach((box, index) => {
        const offset = index - selectedIndexRef.current;
        const wrappedOffset = ((offset + games.length + Math.floor(games.length / 2)) % games.length) - Math.floor(games.length / 2);
        const distance = clamp(wrappedOffset, -3, 3);
        const absolute = Math.abs(distance);
        const selected = distance === 0;
        const targetX = distance * (selected ? 0 : 2.15) + Math.sin(yawRef.current) * (selected ? 0.14 : 0.05);
        const targetY = selected ? 0.42 : 0.16 + Math.max(0, 0.12 - absolute * 0.03);
        const targetZ = selected ? 0.2 : -0.65 - absolute * 0.34;
        const targetScale = selected ? 1.02 : Math.max(0.43, 0.78 - absolute * 0.1);
        const targetRotationY = selected ? yawRef.current : (distance > 0 ? -0.28 : 0.28) + yawRef.current * 0.35;
        const ease = reducedMotion ? 1 : 0.11;
        box.position.x += (targetX - box.position.x) * ease;
        box.position.y += (targetY - box.position.y) * ease;
        box.position.z += (targetZ - box.position.z) * ease;
        box.scale.x += (targetScale - box.scale.x) * ease;
        box.scale.y += (targetScale - box.scale.y) * ease;
        box.scale.z += (targetScale - box.scale.z) * ease;
        box.rotation.y += (targetRotationY - box.rotation.y) * ease;
        const targetRotationX = selected ? Math.sin(elapsed * 0.45) * 0.008 : 0.04;
        box.rotation.x += (targetRotationX - box.rotation.x) * ease;
        box.visible = absolute <= 3;
      });
    }

    function selectFromPointer(event) {
      const rect = renderer.domElement.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(boxes, false);
      if (hits[0]?.object?.userData?.gameId) {
        const nextIndex = games.findIndex((game) => game.id === hits[0].object.userData.gameId);
        if (nextIndex >= 0) onSelectIndex(nextIndex);
      }
    }

    function onPointerDown(event) {
      pointerRef.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      renderer.domElement.setPointerCapture?.(event.pointerId);
    }

    function onPointerMove(event) {
      if (!pointerRef.current) return;
      const deltaX = event.clientX - pointerRef.current.x;
      if (Math.abs(deltaX) > 2) {
        yawRef.current = clamp(yawRef.current + deltaX * 0.0025, -0.24, 0.24);
        pointerRef.current.x = event.clientX;
      }
    }

    function onPointerUp(event) {
      if (!pointerRef.current) return;
      const origin = pointerRef.current;
      const distance = Math.hypot(event.clientX - origin.x, event.clientY - origin.y);
      pointerRef.current = null;
      if (distance < 10) selectFromPointer(event);
    }

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointermove", onPointerMove);
    renderer.domElement.addEventListener("pointerup", onPointerUp);
    renderer.domElement.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", resize);
    resize();
    window.requestAnimationFrame(resize);

    function animate() {
      if (disposed) return;
      const elapsed = (performance.now() - startedAt) / 1000;
      applyBoxTargets(elapsed);
      stage.rotation.y = reducedMotion ? 0 : Math.sin(elapsed * 0.08) * 0.012;
      aurora.position.x = reducedMotion ? 0 : Math.sin(elapsed * 0.06) * 0.12;
      aurora.position.y = reducedMotion ? 0 : Math.cos(elapsed * 0.11) * 0.035;
      snow.rotation.y = reducedMotion ? 0 : elapsed * 0.012;
      camera.lookAt(0, 0.7, -0.35);
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    }

    animate();

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resize);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointermove", onPointerMove);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      renderer.domElement.removeEventListener("pointercancel", onPointerUp);
      boxes.forEach((box) => {
        box.geometry.dispose();
        box.children.forEach((child) => child.geometry?.dispose());
        box.material.forEach((material) => {
          material.map?.dispose();
          material.dispose();
        });
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      onReady?.(false);
    };
  }, [games, onReady, onSelectIndex, reducedMotion]);

  return <div ref={mountRef} className="arctic-webgl-archive" aria-label="3D Arctic Dominion archive scene" />;
}

export default ArcticWebGLArchive;
