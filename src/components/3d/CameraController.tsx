import React, { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import gsapModule from 'gsap';

// Resilient fallback for both ESM and CJS bundle exports
const gsap = (gsapModule as any)?.gsap || gsapModule;

interface CameraControllerProps {
  currentSection?: number;
  focusedCoordinates?: [number, number, number] | null;
  enableControls?: boolean;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  currentSection = 0,
  focusedCoordinates,
  enableControls = true,
}) => {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  // Corridor focus listener from FinTech control deck
  useEffect(() => {
    const handleCorridorFocus = (e: CustomEvent<{ center?: [number, number, number] }>) => {
      const center = e.detail?.center;
      if (!center) {
        // Reset to default global orbit
        if (gsap && gsap.to) {
          gsap.to(camera.position, { x: 0, y: 1.2, z: 5.4, duration: 1.4, ease: 'power2.inOut' });
          if (controlsRef.current) {
            gsap.to(controlsRef.current.target, { x: 0, y: 0, z: 0, duration: 1.4, ease: 'power2.inOut' });
          }
        }
        return;
      }

      const targetX = center[0] * 1.8;
      const targetY = center[1] * 1.8;
      const targetZ = center[2] * 1.8;

      if (gsap && gsap.to) {
        gsap.to(camera.position, {
          x: targetX,
          y: targetY,
          z: targetZ,
          duration: 1.5,
          ease: 'power2.inOut',
          onUpdate: () => {
            camera.lookAt(0, 0, 0);
          },
        });
        if (controlsRef.current) {
          gsap.to(controlsRef.current.target, {
            x: 0,
            y: 0,
            z: 0,
            duration: 1.5,
            ease: 'power2.inOut',
          });
        }
      }
    };

    window.addEventListener('swiftflow:focus-corridor' as any, handleCorridorFocus as EventListener);
    return () => {
      window.removeEventListener('swiftflow:focus-corridor' as any, handleCorridorFocus as EventListener);
    };
  }, [camera]);

  // Smoothly move camera based on scroll story section
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = prefersReducedMotion ? 0.1 : 1.8;

    let targetCamPos = { x: 0, y: 1.5, z: 5.6 };
    let targetLookAt = { x: 0, y: 0, z: 0 };

    switch (currentSection) {
      case 0:
        targetCamPos = { x: 0, y: 1.2, z: 5.4 };
        targetLookAt = { x: 0, y: 0, z: 0 };
        break;
      case 1:
        targetCamPos = { x: -1.8, y: 2.2, z: 4.2 };
        targetLookAt = { x: -0.4, y: 0.8, z: 1.2 };
        break;
      case 2:
        targetCamPos = { x: 3.2, y: 1.8, z: 3.8 };
        targetLookAt = { x: 1.2, y: 0.5, z: 1.5 };
        break;
      case 3:
        targetCamPos = { x: 0.5, y: 3.8, z: 3.4 };
        targetLookAt = { x: 0, y: 0, z: 0 };
        break;
    }

    if (focusedCoordinates) {
      targetLookAt = {
        x: focusedCoordinates[0],
        y: focusedCoordinates[1],
        z: focusedCoordinates[2],
      };
    }

    if (gsap && gsap.to) {
      gsap.to(camera.position, {
        x: targetCamPos.x,
        y: targetCamPos.y,
        z: targetCamPos.z,
        duration,
        ease: 'power2.inOut',
        onUpdate: () => {
          camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
        },
      });

      if (controlsRef.current) {
        gsap.to(controlsRef.current.target, {
          x: targetLookAt.x,
          y: targetLookAt.y,
          z: targetLookAt.z,
          duration,
          ease: 'power2.inOut',
        });
      }
    } else {
      camera.position.set(targetCamPos.x, targetCamPos.y, targetCamPos.z);
      camera.lookAt(targetLookAt.x, targetLookAt.y, targetLookAt.z);
    }
  }, [currentSection, focusedCoordinates, camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      rotateSpeed={0.6}
      minDistance={3.2}
      maxDistance={8.5}
      maxPolarAngle={Math.PI - 0.2}
      minPolarAngle={0.2}
      enabled={enableControls}
    />
  );
};
