import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Sliders, Sparkles, CheckCircle2 } from 'lucide-react';
import { createAnatomicalToothGeometry } from './ToothGeometry';

interface SmileSceneProps {
  className?: string;
}

export const SmileScene: React.FC<SmileSceneProps> = ({ className = '' }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [alignmentProgress, setAlignmentProgress] = useState(100); 
  const [isLoaded, setIsLoaded] = useState(false);

  const alignmentRef = useRef(1.0);
  useEffect(() => {
    alignmentRef.current = alignmentProgress / 100;
  }, [alignmentProgress]);

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
      } catch {
        return false;
      }
    })();

    const width = container.clientWidth;
    const height = container.clientHeight;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0A0D12, 0.05);

    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.2, 5.8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;

    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0x1e293b, 2.0);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.2);
    keyLight.position.set(2, 4, 5);
    scene.add(keyLight);

    const smileGroup = new THREE.Group();
    scene.add(smileGroup);

    const teethMeshes: {
      mesh: THREE.Object3D;
      basePos: THREE.Vector3;
      baseRot: THREE.Euler;
      crowdedOffset: THREE.Vector3;
      crowdedRot: THREE.Euler;
    }[] = [];

    const teethSpecs = [
      { x: -2.0, z: -1.2, scale: [0.42, 0.65, 0.45], rotY: 0.45, cx: -0.15, cz: -0.1, rz: 0.1 },
      { x: -1.5, z: -0.75, scale: [0.45, 0.7, 0.48], rotY: 0.35, cx: 0.1, cz: 0.15, rz: -0.15 },
      { x: -1.0, z: -0.35, scale: [0.48, 0.85, 0.48], rotY: 0.25, cx: -0.12, cz: 0.2, rz: 0.2 },
      { x: -0.52, z: -0.08, scale: [0.46, 0.82, 0.38], rotY: 0.1, cx: 0.08, cz: -0.15, rz: -0.22 },
      { x: -0.23, z: 0.02, scale: [0.5, 0.92, 0.4], rotY: 0.03, cx: -0.05, cz: 0.1, rz: 0.08 },
      { x: 0.23, z: 0.02, scale: [0.5, 0.92, 0.4], rotY: -0.03, cx: 0.06, cz: -0.08, rz: -0.09 },
      { x: 0.52, z: -0.08, scale: [0.46, 0.82, 0.38], rotY: -0.1, cx: -0.09, cz: 0.16, rz: 0.24 },
      { x: 1.0, z: -0.35, scale: [0.48, 0.85, 0.48], rotY: -0.25, cx: 0.12, cz: -0.12, rz: -0.18 },
      { x: 1.5, z: -0.75, scale: [0.45, 0.7, 0.48], rotY: -0.35, cx: -0.1, cz: 0.1, rz: 0.12 },
      { x: 2.0, z: -1.2, scale: [0.42, 0.65, 0.45], rotY: -0.45, cx: 0.15, cz: -0.12, rz: -0.1 },
    ];

    // Direct anatomical smile teeth arch
    createProcedural();

    function createProcedural() {
      const toothGeo = createAnatomicalToothGeometry(32);
      const toothMat = new THREE.MeshPhysicalMaterial({ color: 0xFCFDFE, roughness: 0.15 });

      teethSpecs.forEach((spec) => {
        const mesh = new THREE.Mesh(toothGeo, toothMat);
        mesh.scale.set(spec.scale[0], spec.scale[1], spec.scale[2]);
        const basePos = new THREE.Vector3(spec.x, 0, spec.z);
        const baseRot = new THREE.Euler(0, spec.rotY, 0);
        const crowdedOffset = new THREE.Vector3(spec.cx, 0, spec.cz);
        const crowdedRot = new THREE.Euler(0, spec.rotY + (spec.rz || 0) * 0.5, spec.rz || 0);
        mesh.position.copy(basePos);
        mesh.rotation.copy(baseRot);
        smileGroup.add(mesh);
        teethMeshes.push({ mesh, basePos, baseRot, crowdedOffset, crowdedRot });
      });
      setIsLoaded(true);
    }

    // Interaction & Animation
    let mouseX = 0;
    let mouseY = 0;
    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      mouseX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    window.addEventListener('pointermove', handlePointerMove);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();
      const t = alignmentRef.current;

      teethMeshes.forEach((item) => {
        const targetX = item.basePos.x + item.crowdedOffset.x * (1 - t);
        const targetZ = item.basePos.z + item.crowdedOffset.z * (1 - t);
        item.mesh.position.x = THREE.MathUtils.damp(item.mesh.position.x, targetX, 8, delta);
        item.mesh.position.z = THREE.MathUtils.damp(item.mesh.position.z, targetZ, 8, delta);

        const targetRotY = item.baseRot.y + item.crowdedRot.y * (1 - t);
        const targetRotZ = item.crowdedRot.z * (1 - t);
        item.mesh.rotation.y = THREE.MathUtils.damp(item.mesh.rotation.y, targetRotY, 8, delta);
        item.mesh.rotation.z = THREE.MathUtils.damp(item.mesh.rotation.z, targetRotZ, 8, delta);
      });

      smileGroup.rotation.y = Math.sin(elapsed * 0.8) * 0.12 + mouseX * 0.25;
      smileGroup.rotation.x = Math.sin(elapsed * 0.5) * 0.05 + mouseY * 0.15;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

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
      window.removeEventListener('pointermove', handlePointerMove);
      resizeObserver.disconnect();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);

  return (
    <div className={`relative w-full h-[520px] lg:h-[620px] flex items-center justify-center ${className}`}>
      <div ref={mountRef} className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing [mask-image:radial-gradient(circle_at_center,black_60%,transparent_95%)]" />
      
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#0A0D12]/20 backdrop-blur-sm z-10">
          <div className="w-12 h-12 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        </div>
      )}

      <div className="absolute top-4 left-4 z-10 font-mono text-xs flex items-center gap-2 bg-[#0c1322]/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-cyan-500/30 text-cyan-300">
        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
        <span>SMILE ARCH SYMMETRY: {alignmentProgress === 100 ? '99.8% (GOLDEN RATIO)' : `${(75 + alignmentProgress * 0.24).toFixed(1)}%`}</span>
      </div>

      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 w-[90%] max-w-md bg-[#0d131f]/95 backdrop-blur-md px-5 py-3 rounded-2xl border border-cyan-500/30 shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] flex flex-col gap-2">
        <div className="flex items-center justify-between text-xs font-mono text-stone-400">
          <span>Before</span>
          <span className="text-cyan-300">Digital Alignment</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={alignmentProgress}
          onChange={(e) => setAlignmentProgress(Number(e.target.value))}
          className="w-full h-2 bg-stone-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
        />
      </div>
    </div>
  );
};

