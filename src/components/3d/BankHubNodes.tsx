import React, { useRef, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { FINANCIAL_HUBS } from '../../data/financialHubs';
import { latLngToVector3 } from '../../lib/math3d';
import type { FinancialHub } from '../../types/globe';

interface BankHubNodesProps {
  globeRadius: number;
  selectedHubId?: string | null;
  onSelectHub?: (hub: FinancialHub) => void;
  isModalOpen?: boolean;
}

export const BankHubNodes: React.FC<BankHubNodesProps> = ({
  globeRadius,
  selectedHubId,
  onSelectHub,
  isModalOpen = false,
}) => {
  const pulseRingsRef = useRef<THREE.Group>(null);

  const hubsWithPositions = useMemo(() => {
    return FINANCIAL_HUBS.map((hub) => ({
      ...hub,
      position: latLngToVector3(hub.lat, hub.lng, globeRadius + 0.03),
      normal: latLngToVector3(hub.lat, hub.lng, 1).normalize(),
    }));
  }, [globeRadius]);

  useFrame(({ clock }) => {
    if (pulseRingsRef.current) {
      const time = clock.getElapsedTime();
      pulseRingsRef.current.children.forEach((child, idx) => {
        const mesh = child as THREE.Mesh;
        const scale = 1 + Math.sin(time * 3 + idx) * 0.25;
        mesh.scale.set(scale, scale, scale);
      });
    }
  });

  return (
    <group>
      {/* Node Markers */}
      {hubsWithPositions.map((hub) => {
        const isSelected = selectedHubId === hub.id;
        const nodeSize = hub.tier === 1 ? 0.06 : 0.045;

        return (
          <group key={hub.id} position={hub.position}>
            {/* Core Pin Dot */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectHub?.(hub);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                document.body.style.cursor = 'auto';
              }}
            >
              <sphereGeometry args={[nodeSize, 16, 16]} />
              <meshStandardMaterial
                color={isSelected ? '#ffffff' : hub.color}
                emissive={hub.color}
                emissiveIntensity={isSelected ? 1.5 : 0.8}
                roughness={0.2}
              />
            </mesh>

            {/* Glowing Ring */}
            <mesh
              quaternion={new THREE.Quaternion().setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                hub.normal
              )}
            >
              <ringGeometry args={[nodeSize * 1.4, nodeSize * 2.0, 24]} />
              <meshBasicMaterial
                color={hub.color}
                side={THREE.DoubleSide}
                transparent
                opacity={0.6}
              />
            </mesh>

            {/* Interactive HTML Label - occlude ensures back-facing hubs are hidden; completely suppressed when modal is open */}
            {!isModalOpen && (
              <Html
                position={[0, nodeSize * 2.2, 0]}
                center
                distanceFactor={8}
                zIndexRange={[10, 0]}
                occlude
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectHub?.(hub);
                  }}
                  className={`group flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono whitespace-nowrap transition-all duration-200 pointer-events-auto ${
                    isSelected
                      ? 'bg-cyan-500/90 text-white shadow-[0_0_12px_rgba(6,182,212,0.8)] scale-110'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/60 hover:border-cyan-500/50 backdrop-blur-md'
                  }`}
                  aria-label={`Inspect ${hub.city} Hub`}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: hub.color }}
                  />
                  <span className="font-semibold tracking-wide">{hub.city}</span>
                  <span className="text-[8px] text-slate-400 group-hover:text-cyan-300">
                    {hub.bicPrefix}
                  </span>
                </button>
              </Html>
            )}
          </group>
        );
      })}

      {/* Dynamic Animated Pulse Group */}
      <group ref={pulseRingsRef}>
        {hubsWithPositions.map((hub) => (
          <mesh
            key={`pulse-${hub.id}`}
            position={hub.position}
            quaternion={new THREE.Quaternion().setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              hub.normal
            )}
          >
            <ringGeometry args={[0.08, 0.12, 16]} />
            <meshBasicMaterial
              color={hub.color}
              transparent
              opacity={0.3}
              side={THREE.DoubleSide}
            />
          </mesh>
        ))}
      </group>
    </group>
  );
};
