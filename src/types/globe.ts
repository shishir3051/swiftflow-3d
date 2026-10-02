export interface FinancialHub {
  id: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  bicPrefix: string;
  bankName: string;
  color: string;
  tier: 1 | 2;
  dailyVolumeBln: number;
}

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface CameraWaypoint {
  id: string;
  title: string;
  subtitle: string;
  cameraPosition: Vector3D;
  targetPosition: Vector3D;
  lookAtHubId?: string;
  arcHighlightId?: string;
  storyStep: number;
}
