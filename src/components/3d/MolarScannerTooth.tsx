import React, { Suspense, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, Float, PresentationControls } from '@react-three/drei';
import * as THREE from 'three';
import { createAnatomicalToothGeometry } from './ToothGeometry';

interface MolarScannerToothProps {
  className?: string;
}

const HighFidelityMolar = () => {
  const meshRef = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => createAnatomicalToothGeometry(64), []);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.008;
      const t = state.clock.getElapsedTime();
      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = 0.22 + Math.sin(t * 2) * 0.1;
      }
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={1.25} position={[0, -0.3, 0]}>
      <meshStandardMaterial
        color="#F8FAFC"
        roughness={0.12}
        metalness={0.4}
        emissive="#00F0FF"
        emissiveIntensity={0.22}
      />
    </mesh>
  );
};

export const MolarScannerTooth: React.FC<MolarScannerToothProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-[400px] sm:h-[480px] lg:h-[520px] flex items-center justify-center overflow-hidden ${className}`}>
      {/* Native 3D Viewport */}
      <div className="relative w-full h-full max-w-[500px] flex items-center justify-center overflow-hidden [mask-image:radial-gradient(circle_at_center,black_45%,rgba(0,0,0,0.8)_65%,transparent_90%)] [-webkit-mask-image:radial-gradient(circle_at_center,black_45%,rgba(0,0,0,0.8)_65%,transparent_90%)]">
        
        <div className="absolute inset-0 z-10">
          <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <Suspense fallback={null}>
              <ambientLight intensity={0.8} />
              <pointLight position={[10, 10, 10]} intensity={1.2} color="#00F0FF" />
              <spotLight position={[-10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
              
              <PresentationControls
                global
                snap
                rotation={[0, 0.3, 0]}
                polar={[-Math.PI / 4, Math.PI / 4]}
                azimuth={[-Math.PI / 2, Math.PI / 2]}
              >
                <Float speed={1.5} rotationIntensity={0.4} floatIntensity={0.4}>
                  <HighFidelityMolar />
                </Float>
              </PresentationControls>
              
              <Environment preset="city" />
            </Suspense>
          </Canvas>
        </div>

        <div className="absolute inset-0 pointer-events-none z-20">
          {/* High-Tech Grid Overlay */}
          <div className="absolute inset-0 opacity-[0.1] bg-[linear-gradient(rgba(6,182,212,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.2)_1px,transparent_1px)] bg-[length:30px_30px]"></div>

          {/* Animated Laser Scan Beam */}
          <div className="absolute inset-0">
            <motion.div
              animate={{
                top: ['15%', '85%', '15%'],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="absolute left-0 right-0 z-30"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[450px] h-[60px] bg-cyan-400/10 blur-3xl mix-blend-screen"></div>
              <div className="h-[2px] w-full bg-cyan-400/80 shadow-[0_0_20px_4px_rgba(6,182,212,0.8)] relative">
                <div className="absolute inset-0 bg-white/40 animate-pulse"></div>
                <div className="absolute -top-6 left-12 flex items-center gap-2">
                  <div className="w-1 h-1 bg-cyan-400 rounded-full animate-ping"></div>
                  <div className="text-[7px] font-mono text-cyan-300 tracking-[0.2em] uppercase font-bold bg-black/40 px-2 py-0.5 rounded">Scanning_Ref_01</div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* HUD Accents */}
          <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-72 h-72 pointer-events-none opacity-20">
            <div className="absolute inset-0 border border-cyan-500/20 rounded-full animate-[spin_20s_linear_infinite]"></div>
            <div className="absolute inset-8 border border-dashed border-cyan-500/10 rounded-full animate-[spin_30s_linear_infinite_reverse]"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

