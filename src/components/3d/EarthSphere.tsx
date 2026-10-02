import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

interface EarthSphereProps {
  radius?: number;
  autoRotate?: boolean;
}

export const EarthSphere: React.FC<EarthSphereProps> = ({
  radius = 2.5,
  autoRotate = true,
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);

  // Generate high-resolution procedural dark grid / tech texture for globe surface
  const globeTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Base dark ocean
      ctx.fillStyle = '#060d1f';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Tech coordinate grid lines
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.12)';
      ctx.lineWidth = 1;

      // Latitudinal lines
      for (let y = 0; y <= canvas.height; y += 64) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Longitudinal lines
      for (let x = 0; x <= canvas.width; x += 64) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      // Continent approximation dots / clusters
      ctx.fillStyle = 'rgba(59, 130, 246, 0.45)';
      for (let i = 0; i < 4000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        // Simple shape biasing to make continents look organic
        const inEquator = Math.abs(y - 512) < 380;
        if (inEquator && Math.sin(x * 0.01) * Math.cos(y * 0.01) > -0.25) {
          ctx.beginPath();
          ctx.arc(x, y, Math.random() * 2 + 1, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  useFrame((_, delta) => {
    if (autoRotate && meshRef.current) {
      meshRef.current.rotation.y += delta * 0.05;
    }
    if (autoRotate && cloudsRef.current) {
      cloudsRef.current.rotation.y += delta * 0.07;
    }
  });

  return (
    <group>
      {/* Main Earth Body */}
      <mesh ref={meshRef} receiveShadow castShadow>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={globeTexture}
          roughness={0.7}
          metalness={0.2}
          emissive="#030712"
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Atmospheric Inner/Outer Glow */}
      <mesh ref={atmosphereRef}>
        <sphereGeometry args={[radius * 1.025, 48, 48]} />
        <meshBasicMaterial
          color="#06b6d4"
          transparent
          opacity={0.08}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Outer Halo */}
      <mesh>
        <sphereGeometry args={[radius * 1.08, 32, 32]} />
        <meshBasicMaterial
          color="#3b82f6"
          transparent
          opacity={0.04}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
};
