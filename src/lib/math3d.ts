import * as THREE from 'three';

/**
 * Converts latitude and longitude to 3D Cartesian coordinates on a sphere of radius R.
 * Note: Three.js coordinates: Y is up, X is right, Z is front.
 */
export function latLngToVector3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);

  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);

  return new THREE.Vector3(x, y, z);
}

/**
 * Creates a smooth elevated quadratic or cubic bezier curve between two points on the sphere.
 */
export function createArcCurve(
  v1: THREE.Vector3,
  v2: THREE.Vector3,
  globeRadius: number,
  altitudeFactor = 0.35
): THREE.CubicBezierCurve3 {
  const distance = v1.distanceTo(v2);
  const maxAltitude = globeRadius + Math.max(distance * altitudeFactor, 0.4);

  // Midpoint projected outward from center of sphere
  const midPoint = new THREE.Vector3().addVectors(v1, v2).multiplyScalar(0.5);
  const midDir = midPoint.clone().normalize();

  // Control points elevated along the normal
  const control1 = new THREE.Vector3()
    .addVectors(v1.clone().multiplyScalar(0.7), v2.clone().multiplyScalar(0.3))
    .normalize()
    .multiplyScalar(maxAltitude);

  const control2 = new THREE.Vector3()
    .addVectors(v1.clone().multiplyScalar(0.3), v2.clone().multiplyScalar(0.7))
    .normalize()
    .multiplyScalar(maxAltitude);

  return new THREE.CubicBezierCurve3(v1, control1, control2, v2);
}

/**
 * Computes great-circle distance between two lat/lng coordinates in kilometers.
 */
export function greatCircleDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
