import React, { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EarthSphere } from './EarthSphere';
import { BankHubNodes } from './BankHubNodes';
import { PaymentArcStream } from './PaymentArcStream';
import { CameraController } from './CameraController';
import type { PaymentArcData } from '../../types/swift';
import type { FinancialHub } from '../../types/globe';

interface CanvasSceneProps {
  autoRotate: boolean;
  selectedHub: FinancialHub | null;
  selectedTx: PaymentArcData | null;
  currentSection: number;
  isModalOpen?: boolean;
  onSelectHub: (hub: FinancialHub) => void;
  onSelectArc: (arc: PaymentArcData) => void;
}

export default function CanvasScene({
  autoRotate,
  selectedHub,
  selectedTx,
  currentSection,
  isModalOpen = false,
  onSelectHub,
  onSelectArc,
}: CanvasSceneProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.2, 5.5], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={1.2} color="#ffffff" />
      <pointLight position={[-5, -3, -5]} intensity={0.6} color="#06b6d4" />
      <pointLight position={[0, 6, 0]} intensity={0.8} color="#3b82f6" />

      <Suspense fallback={null}>
        <EarthSphere radius={2.5} autoRotate={autoRotate} />
        <BankHubNodes
          globeRadius={2.5}
          selectedHubId={selectedHub?.id}
          onSelectHub={onSelectHub}
          isModalOpen={isModalOpen || !!selectedTx}
        />
        <PaymentArcStream
          globeRadius={2.5}
          selectedArcId={selectedTx?.id}
          onSelectArc={onSelectArc}
        />
        <CameraController currentSection={currentSection} />
      </Suspense>
    </Canvas>
  );
}
