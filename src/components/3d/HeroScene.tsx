import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { createAnatomicalToothGeometry } from './ToothGeometry';

interface HeroSceneProps {
  className?: string;
}

export const HeroScene: React.FC<HeroSceneProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch { return false; }
    })();

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0A0D12, 8, 22);

    // Exact scanner camera FOV (48) and distance (6.0) across all devices
    const camera = new THREE.PerspectiveCamera(48, width / height, 0.1, 100);
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

    const ambientLight = new THREE.AmbientLight(0xfffbf5, 0.8);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xfff7ed, 2.5);
    keyLight.position.set(4, 8, 6);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0xbae6fd, 2.0);
    rimLight.position.set(-6, 4, -4);
    scene.add(rimLight);

    const toothGroup = new THREE.Group();
    scene.add(toothGroup);

    let toothMesh: THREE.Object3D;
    let isGltf = false;

    const loader = new GLTFLoader();
    loader.load(
      '/tooth.glb',
      (gltf) => {
        isGltf = true;
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 3.5 / maxDim;

        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += 0.35;

        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) {
            const mesh = child as THREE.Mesh;
            mesh.castShadow = !isSoftwareGl;
            mesh.receiveShadow = !isSoftwareGl;
          }
        });

        toothMesh = model;
        toothGroup.add(toothMesh);
        setIsLoaded(true);
      },
      undefined,
      () => { createProcedural(); }
    );

    function createProcedural() {
      const toothGeo = createAnatomicalToothGeometry(42);
      const toothMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xFDFAF5,
        roughness: 0.15,
        metalness: 0.05,
        clearcoat: 0.9,
        ior: 1.54,
      });
      toothMesh = new THREE.Mesh(toothGeo, toothMaterial);
      // Exact scanner tooth scale (1.0) on both desktop and mobile
      const tScale = 1.0;
      toothMesh.scale.set(tScale, tScale, tScale);
      toothGroup.add(toothMesh);
      setIsLoaded(true);
    }

    let animationFrameId: number;
    let controls: any;
    const clock = new THREE.Clock();
    
    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      toothGroup.rotation.y += delta * 0.35;
      if (toothMesh) {
        toothMesh.position.y = (isGltf ? 0.35 : 0.0) + Math.sin(elapsed * 1.5) * 0.04;
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
      controls.minDistance = 6.0;
      controls.maxDistance = 6.0;
      controls.target.set(0, 0.2, 0);
      animate();
    })();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.fov = 48;
      camera.position.set(0, 0.5, 6.0);
      camera.lookAt(0, 0.2, 0);
      camera.updateProjectionMatrix();
      if (controls) {
        controls.minDistance = 6.0;
        controls.maxDistance = 6.0;
        controls.target.set(0, 0.2, 0);
        controls.update();
      }
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (controls) controls.dispose();
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative w-full h-[320px] sm:h-[400px] lg:h-[480px] flex items-center justify-center ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing [mask-image:radial-gradient(circle_at_center,black_60%,transparent_95%)]" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0D12]/20 backdrop-blur-sm z-10">
          <div className="w-12 h-12 border-2 border-amber-500/20 border-t-amber-500 rounded-full animate-spin"></div>
        </div>
      )}
    </div>
  );
};

