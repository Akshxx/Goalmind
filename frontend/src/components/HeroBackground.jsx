import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export default function HeroBackground() {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;
    
    const container = mountRef.current;
    const scene = new THREE.Scene();
    
    // GoalMind color palette
    const midnight = new THREE.Color(0x0B1028);      // Deep Midnight
    const indigo = new THREE.Color(0x1E1B4B);        // Deep Indigo
    const electricIndigo = new THREE.Color(0x4F46E5); // Electric Indigo
    const cyan = new THREE.Color(0x06B6D4);           // Electric Cyan
    
    const params = {
      speed: 6.0,
      showCeiling: true,
      scale: 30.0,
      heightMultiplier: 3.6,
      detailStrength: 0.27,
      valleyWidth: 25.0,
      flatShading: false,
      wireframe: true,
      bgColor: midnight,
      fogDensity: 0.012,
      groundColor: indigo,
      ceilingColor: electricIndigo,
      ambientInt: 0.4,
      camLightInt: 1.2
    };

    scene.background = params.bgColor;
    scene.fog = new THREE.FogExp2(params.bgColor, params.fogDensity);

    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 300);
    camera.position.set(0, 0, 40);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', precision: 'highp' });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    // Clear any existing canvas if hot reloading
    while (container.firstChild) {
      container.removeChild(container.firstChild);
    }
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0xffffff, params.bgColor, params.ambientInt);
    scene.add(hemiLight);

    // Cyan accent light that moves with camera
    const camLight = new THREE.PointLight(cyan, params.camLightInt, 120, 1.5);
    scene.add(camLight);

    const noise2D = createNoise2D();

    const CHUNK_WIDTH = 250;
    const CHUNK_LENGTH = 60;
    const SEGMENTS_W = 100;
    const SEGMENTS_L = 30;
    const CHUNK_COUNT = 6;
    const chunks = [];

    function getElevation(x, z, isTop) {
      const offset = isTop ? 9999 : 0;
      let y = noise2D((x + offset) / params.scale, (z + offset) / params.scale) * params.heightMultiplier;
      const detailScale = params.scale * 0.4;
      y += noise2D((x + offset) / detailScale, (z + offset) / detailScale) * (params.heightMultiplier * params.detailStrength);
      const dist = Math.abs(x);
      const valley = Math.pow(dist / params.valleyWidth, 2.5);
      y += valley;
      return y;
    }

    function createChunk(index) {
      const geometry = new THREE.PlaneGeometry(CHUNK_WIDTH, CHUNK_LENGTH, SEGMENTS_W, SEGMENTS_L);
      geometry.rotateX(-Math.PI / 2);

      const matGround = new THREE.MeshStandardMaterial({
        color: params.groundColor, roughness: 0.9, flatShading: params.flatShading,
        wireframe: params.wireframe, side: THREE.DoubleSide, dithering: true
      });

      const matCeil = new THREE.MeshStandardMaterial({
        color: params.ceilingColor, roughness: 0.9, flatShading: params.flatShading,
        wireframe: params.wireframe, side: THREE.DoubleSide, dithering: true
      });

      const meshGround = new THREE.Mesh(geometry.clone(), matGround);
      const meshCeil = new THREE.Mesh(geometry.clone(), matCeil);
      meshCeil.visible = params.showCeiling;

      const group = new THREE.Group();
      group.add(meshGround);
      group.add(meshCeil);
      group.userData = { meshGround, meshCeil, index: index };
      return group;
    }

    function updateChunk(chunk) {
      const zPosition = chunk.userData.index * -CHUNK_LENGTH;
      chunk.position.z = zPosition;

      const geoG = chunk.userData.meshGround.geometry;
      const posG = geoG.attributes.position;
      const geoC = chunk.userData.meshCeil.geometry;
      const posC = geoC.attributes.position;

      for (let i = 0; i < posG.count; i++) {
        const x = posG.getX(i);
        const localZ = posG.getZ(i);
        const worldZ = zPosition + localZ;
        const hGround = getElevation(x, worldZ, false);
        posG.setY(i, -5 + hGround);
        const hCeil = getElevation(x, worldZ, true);
        posC.setY(i, 5 - hCeil);
      }
      posG.needsUpdate = true;
      geoG.computeVertexNormals();
      posC.needsUpdate = true;
      geoC.computeVertexNormals();
    }

    for (let i = 0; i < CHUNK_COUNT; i++) {
      const chunk = createChunk(i);
      updateChunk(chunk);
      chunks.push(chunk);
      scene.add(chunk);
    }

    const clock = new THREE.Clock();
    let animationFrameId;

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const dt = clock.getDelta();
      camera.position.z -= params.speed * dt;
      camLight.position.copy(camera.position);

      let maxIndex = 0;
      chunks.forEach(c => { if (c.userData.index > maxIndex) maxIndex = c.userData.index; });

      chunks.forEach(chunk => {
        if (chunk.position.z > camera.position.z + CHUNK_LENGTH) {
          chunk.userData.index = maxIndex + 1;
          maxIndex++;
          updateChunk(chunk);
        }
      });
      renderer.render(scene, camera);
    }
    animate();

    const handleResize = () => {
      if (!mountRef.current) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (mountRef.current && mountRef.current.firstChild) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}