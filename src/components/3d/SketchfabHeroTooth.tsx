import React, { Suspense, useMemo, useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { PresentationControls, ContactShadows, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { createAnatomicalToothGeometry } from './ToothGeometry';

interface SketchfabHeroToothProps {
  className?: string;
}

const HighFidelityTooth = () => {
  const geometry = useMemo(() => createAnatomicalToothGeometry(64), []);
  const meshRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    if (meshRef.current) {
      const t = state.clock.getElapsedTime();
      meshRef.current.rotation.y = t * 0.15;
    }
  });

  return (
    <mesh ref={meshRef} geometry={geometry} scale={1.25} position={[0, -0.2, 0]} castShadow receiveShadow>
      <meshPhysicalMaterial 
        color="#FDFAF5"
        roughness={0.12}
        metalness={0.05}
        clearcoat={1.0}
        clearcoatRoughness={0.1}
        ior={1.55}
        transmission={0.05}
        thickness={0.5}
        specularIntensity={1.0}
        specularColor={new THREE.Color(0xffffff)}
      />
    </mesh>
  );
};

export const SketchfabHeroTooth: React.FC<SketchfabHeroToothProps> = ({ className = '' }) => {
  return (
    <div className={`relative w-full h-[450px] sm:h-[550px] lg:h-[650px] flex flex-col items-center justify-center select-none ${className}`}>
      {/* Background Studio Glow */}
      <div className="absolute w-[400px] sm:w-[600px] h-[400px] sm:h-[600px] rounded-full bg-amber-500/5 blur-[140px] pointer-events-none -z-10"></div>
      
      {/* Native 3D Viewport */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden [mask-image:radial-gradient(circle_at_center,black_55%,transparent_95%)]">
        <Canvas
          shadows
          camera={{ position: [0, 0.5, 7], fov: 32 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          dpr={[1, 2]}
        >
          <Suspense fallback={null}>
            <StageLight />
            <PresentationControls
              global
              snap
              rotation={[0, 0, 0]}
              polar={[-Math.PI / 4, Math.PI / 4]}
              azimuth={[-Math.PI / 2, Math.PI / 2]}
            >
              <Float speed={1.8} rotationIntensity={0.3} floatIntensity={0.4}>
                <HighFidelityTooth />
              </Float>
            </PresentationControls>
            <ContactShadows 
              opacity={0.3} 
              scale={8} 
              blur={2.5} 
              far={2} 
              resolution={512} 
              color="#000000" 
              position={[0, -2.5, 0]}
            />
            <Environment preset="city" />
          </Suspense>
        </Canvas>
      </div>
    </div>
  );
};

const StageLight = () => {
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <spotLight position={[-10, 15, 10]} angle={0.3} penumbra={1} intensity={2} castShadow />
    </>
  );
};
