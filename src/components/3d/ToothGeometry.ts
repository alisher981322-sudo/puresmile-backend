import * as THREE from 'three';

/**
 * Anatomically Realistic Human Dental Molar Geometry
 * Recreates a true anatomical mandibular/maxillary molar:
 * - 4 distinct rounded occlusal cusps with central developmental fossa/sulcus
 * - Convex enamel crown walls with natural cervical bulge
 * - Smooth cervical constriction (neck)
 * - Anatomically curved bifurcated roots with smooth cleft
 */
export function createAnatomicalToothGeometry(detail = 42): THREE.BufferGeometry {
  const rings = detail;
  const segments = detail;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  // Molar dimensions:
  // y = 0.5 to 1.7: Anatomical Crown with 4 cusps
  // y = 0.2 to 0.5: Cervical Line & Enamel margin
  // y = -1.6 to 0.2: Bifurcated roots (Mesial and Distal)

  const totalRings = rings;
  for (let r = 0; r <= totalRings; r++) {
    const v = r / totalRings;
    // Map v from 0 (root tips) to 1 (crown occlusal surface)
    const y = -1.55 + v * 3.35;

    for (let s = 0; s <= segments; s++) {
      const u = s / segments;
      const angle = u * Math.PI * 2;

      let radiusX = 1.0;
      let radiusZ = 1.0;
      let offsetY = 0;
      let offsetX = 0;
      let offsetZ = 0;

      if (v > 0.58) {
        // --- ANATOMICAL CROWN SECTION (v: 0.58 to 1.0) ---
        const crownT = (v - 0.58) / 0.42; // 0 at cervix, 1 at cusp tips

        // 4 rounded quadrilateral cusps:
        // Using cos(2*angle) creates 4 corners, sin(4*angle) softens the fissures
        const quadMod = Math.cos(2 * angle) * 0.16 + Math.cos(4 * angle) * 0.03;
        
        // Natural bulbous contour of dental enamel (greatest contour at middle third)
        const enamelBulge = Math.sin(crownT * Math.PI * 0.85) * 0.28;

        radiusX = 1.12 + quadMod * 0.65 + enamelBulge;
        radiusZ = 0.98 - quadMod * 0.55 + enamelBulge;

        // OCCLUSAL TABLE & 4 CUSPS (Top surface crownT > 0.75)
        if (crownT > 0.75) {
          const topT = (crownT - 0.75) / 0.25;

          // Inward taper of occlusal table edges
          const occlusalRoll = 1.0 - topT * 0.22;
          radiusX *= occlusalRoll;
          radiusZ *= occlusalRoll;

          // 4 Rounded Cusps Elevation:
          // Cusps located at corners (angle = PI/4, 3PI/4, 5PI/4, 7PI/4)
          // cos(2 * angle) creates the 4 distinct cusp elevations
          const cuspHeight = (Math.cos(2 * angle) + 1.0) * 0.2 * topT;
          
          // Central sulcus indent (fissure depression in center of occlusal table)
          const fissureIndent = -Math.sin(4 * angle) * 0.06 * topT;

          offsetY += cuspHeight + fissureIndent;
        }

      } else if (v > 0.42) {
        // --- CERVICAL NECK (v: 0.42 to 0.58) ---
        // Natural gentle narrowing at the cementoenamel junction (CEJ)
        const neckT = (v - 0.42) / 0.16;
        radiusX = 0.92 + neckT * 0.18;
        radiusZ = 0.82 + neckT * 0.14;

      } else {
        // --- BIFURCATED ROOTS (v: 0.0 to 0.42) ---
        // Roots split into two distinct mesial and distal roots
        const rootT = v / 0.42; // 0 at root tips, 1 at bifurcation
        const rootTaper = 0.38 + rootT * 0.56;

        // Bifurcation groove: deep pinch along Z axis creates two distinct roots along X
        const pinchStrength = (1.0 - rootT) * 0.48;
        const zPinch = Math.max(0.25, 1.0 - pinchStrength * Math.abs(Math.sin(angle)));

        radiusX = (0.92 * rootTaper) + pinchStrength * 0.26;
        radiusZ = (0.82 * rootTaper) * zPinch;

        // Natural distal apical curvature (roots curve slightly backward)
        offsetZ = -(1.0 - rootT) * 0.22;
      }

      const x = Math.cos(angle) * radiusX + offsetX;
      const z = Math.sin(angle) * radiusZ + offsetZ;
      const finalY = y + offsetY;

      positions.push(x, finalY, z);
      uvs.push(u, v);
    }
  }

  // Generate Triangles
  for (let r = 0; r < totalRings; r++) {
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s;
      const b = (r + 1) * (segments + 1) + s;
      const c = (r + 1) * (segments + 1) + (s + 1);
      const d = r * (segments + 1) + (s + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
