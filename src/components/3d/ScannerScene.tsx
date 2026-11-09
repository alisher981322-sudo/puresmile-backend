import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createAnatomicalToothGeometry } from './ToothGeometry';

interface ScannerSceneProps {
  className?: string;
  onMetricUpdate?: (metrics: { laserY: number; density: number; angle: number }) => void;
}

export const ScannerScene: React.FC<ScannerSceneProps> = ({ className = '', onMetricUpdate }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // 🔥 FIX: Store the callback in a ref so the animation loop always has the latest version
  // without triggering the useEffect dependency array.
  const onMetricUpdateRef = useRef(onMetricUpdate);

  useEffect(() => {
    onMetricUpdateRef.current = onMetricUpdate;
  }, [onMetricUpdate]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    // Standard GPU check
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? (ext as any).UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch { return false; }
    })();

    const width = container.clientWidth;
    const height = container.clientHeight;
    const isMobile = width < 640;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0A0D12, 0.045);

    const camera = new THREE.PerspectiveCamera(isMobile ? 48 : 42, width / height, 0.1, 100);
    camera.position.set(0, 0.5, 6.0);
    camera.lookAt(0, 0.2, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);

    // Dynamic Lighting
    scene.add(new THREE.AmbientLight(0x0f172a, 2.0));
    const mainKeyLight = new THREE.DirectionalLight(0xe2e8f0, 2.5);
    mainKeyLight.position.set(3, 5, 4);
    scene.add(mainKeyLight);
    const cyanRim = new THREE.DirectionalLight(0x06b6d4, 3.5);
    cyanRim.position.set(-4, 3, -3);
    scene.add(cyanRim);
    const laserLight = new THREE.PointLight(0x00F0FF, 6.0, 5.0);
    scene.add(laserLight);

    const toothRootGroup = new THREE.Group();
    scene.add(toothRootGroup);

    let toothMesh: THREE.Object3D | null = null;

    const loader = new GLTFLoader();
    loader.load(
      '/tooth.glb',
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        
        // Scale and Center
        const scale = (isMobile ? 3.5 : 5.2) / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y = 0.4;

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.material = new THREE.MeshPhysicalMaterial({
              color: 0xFDFAF5,
              roughness: 0.15,
              metalness: 0.05,
              clearcoat: 0.9,
              ior: 1.54,
            });
          }
        });
        
        while(toothRootGroup.children.length > 0) toothRootGroup.remove(toothRootGroup.children[0]);
        toothRootGroup.add(model);
        toothMesh = model;
        setIsLoaded(true);
      },
      undefined,
      () => {
        // Fallback procedural model
        const toothGeo = createAnatomicalToothGeometry(42);
        const m = new THREE.Mesh(toothGeo, new THREE.MeshPhysicalMaterial({
          color: 0xFDFAF5,
          roughness: 0.15,
          metalness: 0.05,
          clearcoat: 0.9,
          ior: 1.54,
        }));
        const tScale = isMobile ? 1.0 : 1.4;
        m.scale.set(tScale, tScale, tScale);
        while(toothRootGroup.children.length > 0) toothRootGroup.remove(toothRootGroup.children[0]);
        toothRootGroup.add(m);
        toothMesh = m;
        setIsLoaded(true);
      }
    );

    // Laser Beam Visuals
    const laserBeamGroup = new THREE.Group();
    scene.add(laserBeamGroup);
    const scanPlaneMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.5, 5.5),
      new THREE.MeshBasicMaterial({
        color: 0x00F0FF,
        transparent: true,
        opacity: 0.12,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      })
    );
    scanPlaneMesh.rotateX(-Math.PI / 2);
    laserBeamGroup.add(scanPlaneMesh);

    let animationFrameId: number;
    let controls: any;
    const clock = new THREE.Clock();
    let currentLaserY = 0;
    let lastMetricUpdate = 0; // 🔥 FIX: Time accumulator variable

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Laser sweep logic
      const sweepProgress = (Math.sin(elapsed * 1.8) + 1) / 2;
      const sweepSpan = isMobile ? 3.0 : 4.8;
      const sweepStart = isMobile ? -1.2 : -2.0;
      currentLaserY = sweepStart + sweepProgress * sweepSpan;

      laserBeamGroup.position.y = currentLaserY;
      laserLight.position.y = currentLaserY;

      // 🔥 FIX: Use time-based accumulator instead of frame modulo to prevent jitter
      if (onMetricUpdateRef.current && elapsed - lastMetricUpdate > 0.08) { // ~12.5 FPS
        const currentAngle = Math.round(((toothRootGroup.rotation.y % (Math.PI * 2)) / (Math.PI * 2)) * 360);
        onMetricUpdateRef.current({
          laserY: currentLaserY,
          density: parseFloat((94.0 + Math.sin(elapsed * 2.5) * 5.4).toFixed(1)),
          angle: currentAngle < 0 ? currentAngle + 360 : currentAngle,
        });
        lastMetricUpdate = elapsed;
      }

      if (controls) controls.update();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    (async () => {
      const { OrbitControls } = await import('three/examples/jsm/controls/OrbitControls.js');
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.enablePan = false;
      controls.enableZoom = false;
      animate();
    })();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (controls) controls.dispose();
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative w-full h-[320px] sm:h-[400px] lg:h-[480px] flex items-center justify-center ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing [mask-image:radial-gradient(circle_at_center,black_60%,transparent_95%)]" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0D12]/20 backdrop-blur-sm z-10">
          <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};
