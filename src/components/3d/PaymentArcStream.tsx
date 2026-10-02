import React, { useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { FINANCIAL_HUBS } from '../../data/financialHubs';
import { SAMPLE_TRANSACTIONS } from '../../data/sampleTransactions';
import { latLngToVector3, createArcCurve } from '../../lib/math3d';
import type { PaymentArcData } from '../../types/swift';

interface PaymentArcStreamProps {
  globeRadius: number;
  selectedArcId?: string | null;
  onSelectArc?: (arc: PaymentArcData) => void;
}

export const PaymentArcStream: React.FC<PaymentArcStreamProps> = ({
  globeRadius,
  selectedArcId,
  onSelectArc,
}) => {
  const [hoveredArcId, setHoveredArcId] = useState<string | null>(null);

  // Precompute curves and geometries for each transaction
  const arcData = useMemo(() => {
    const hubMap = new Map(FINANCIAL_HUBS.map((h) => [h.id, h]));

    return SAMPLE_TRANSACTIONS.map((tx) => {
      const srcHub = hubMap.get(tx.sourceHubId);
      const tgtHub = hubMap.get(tx.targetHubId);

      if (!srcHub || !tgtHub) return null;

      const v1 = latLngToVector3(srcHub.lat, srcHub.lng, globeRadius);
      const v2 = latLngToVector3(tgtHub.lat, tgtHub.lng, globeRadius);
      const curve = createArcCurve(v1, v2, globeRadius, 0.4);

      // Points along curve for line geometry
      const points = curve.getPoints(50);
      const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);

      return {
        tx,
        srcHub,
        tgtHub,
        curve,
        lineGeometry,
      };
    }).filter(Boolean) as {
      tx: PaymentArcData;
      srcHub: (typeof FINANCIAL_HUBS)[0];
      tgtHub: (typeof FINANCIAL_HUBS)[0];
      curve: THREE.CubicBezierCurve3;
      lineGeometry: THREE.BufferGeometry;
    }[];
  }, [globeRadius]);

  return (
    <group>
      {arcData.map(({ tx, srcHub, curve, lineGeometry }) => {
        const isSelected = selectedArcId === tx.id;
        const isHovered = hoveredArcId === tx.id;

        return (
          <group key={tx.id}>
            {/* The Static Arc Line */}
            <primitive
              object={
                new THREE.Line(
                  lineGeometry,
                  new THREE.LineBasicMaterial({
                    color: isSelected ? '#ffffff' : isHovered ? '#38bdf8' : srcHub.color,
                    transparent: true,
                    opacity: isSelected ? 0.9 : isHovered ? 0.75 : 0.4,
                    linewidth: 1,
                  })
                )
              }
            />

            {/* Wider transparent clickable hit cylinder/tube around arc */}
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onSelectArc?.(tx);
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                setHoveredArcId(tx.id);
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                setHoveredArcId(null);
                document.body.style.cursor = 'auto';
              }}
            >
              <tubeGeometry args={[curve, 30, 0.05, 6, false]} />
              <meshBasicMaterial transparent opacity={0.0} />
            </mesh>

            {/* Glowing Traveling Particles along Arc */}
            <ArcParticle
              curve={curve}
              color={srcHub.color}
              speed={1.0 / (tx.latencyMs / 60)}
              size={isSelected ? 0.05 : 0.038}
            />
          </group>
        );
      })}
    </group>
  );
};

interface ArcParticleProps {
  curve: THREE.CubicBezierCurve3;
  color: string;
  speed: number;
  size: number;
}

const ArcParticle: React.FC<ArcParticleProps> = ({ curve, color, speed, size }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(Math.random());

  useFrame((_, delta) => {
    progressRef.current = (progressRef.current + delta * speed * 0.35) % 1;

    if (meshRef.current) {
      const pos = curve.getPointAt(progressRef.current);
      meshRef.current.position.copy(pos);
    }

    if (trailRef.current) {
      const trailProgress = (progressRef.current - 0.04 + 1) % 1;
      const trailPos = curve.getPointAt(trailProgress);
      trailRef.current.position.copy(trailPos);
    }
  });

  return (
    <group>
      {/* Lead Packet */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>

      {/* Trailing Glow Particle */}
      <mesh ref={trailRef}>
        <sphereGeometry args={[size * 0.75, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.7} />
      </mesh>
    </group>
  );
};
