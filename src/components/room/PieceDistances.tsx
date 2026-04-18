import { Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import type { FurniturePiece, Vec3 } from '../../types';

/** Compute the world-space axis-aligned bounding box for a piece. */
function getPieceAABB(piece: FurniturePiece): { min: Vec3; max: Vec3 } {
  const pieceQuat = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(piece.rotation[0], piece.rotation[1], piece.rotation[2])
  );

  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const comp of piece.components) {
    const compQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(comp.rotation[0], comp.rotation[1], comp.rotation[2])
    );
    // Total rotation = piece rotation * component rotation
    const totalQuat = new THREE.Quaternion().multiplyQuaternions(pieceQuat, compQuat);
    const totalEuler = new THREE.Euler().setFromQuaternion(totalQuat);

    let hw: number, hh: number, hd: number;
    if (comp.type === 'panel') {
      hw = comp.width / 2;
      hh = comp.height / 2;
      hd = comp.depth / 2;
    } else if (comp.type === 'leg') {
      hw = comp.diameter / 2;
      hh = comp.height; // legs extend upward from position
      hd = comp.diameter / 2;
    } else {
      // hardware — small bounding
      hw = 20;
      hh = 20;
      hd = 20;
    }

    // Compute rotation-aware half-extents (same formula as snap.ts getAABBHalfExtents)
    const [rx, ry, rz] = [totalEuler.x, totalEuler.y, totalEuler.z];
    const cx = Math.cos(rx), sx = Math.sin(rx);
    const cy = Math.cos(ry), sy = Math.sin(ry);
    const cz = Math.cos(rz), sz = Math.sin(rz);
    const ex = Math.abs(cy * cz) * hw + Math.abs(sx * sy * cz - cx * sz) * hh + Math.abs(cx * sy * cz + sx * sz) * hd;
    const ey = Math.abs(cy * sz) * hw + Math.abs(sx * sy * sz + cx * cz) * hh + Math.abs(cx * sy * sz - sx * cz) * hd;
    const ez = Math.abs(sy) * hw + Math.abs(sx * cy) * hh + Math.abs(cx * cy) * hd;

    // Rotate component position by piece rotation and add piece position
    const compPos = new THREE.Vector3(comp.position[0], comp.position[1], comp.position[2]);
    compPos.applyQuaternion(pieceQuat);
    const wx = piece.position[0] + compPos.x;
    const wy = piece.position[1] + compPos.y;
    const wz = piece.position[2] + compPos.z;

    minX = Math.min(minX, wx - ex);
    minY = Math.min(minY, wy - ey);
    minZ = Math.min(minZ, wz - ez);
    maxX = Math.max(maxX, wx + ex);
    maxY = Math.max(maxY, wy + ey);
    maxZ = Math.max(maxZ, wz + ez);
  }

  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

interface DistanceLabel {
  /** World-space points for the dimension line (2 points) */
  linePoints: [number, number, number][];
  /** Position for the text label */
  textPos: [number, number, number];
  /** Text to display */
  text: string;
  /** Color */
  color: string;
}

export function PieceDistances() {
  const showDistances = useStore((s) => s.showDistances);
  const pieces = useStore((s) => s.project.pieces);
  const room = useStore((s) => s.project.room);

  if (!showDistances || pieces.length === 0) return null;

  // Wall planes (room is centered at origin on X/Z, floor at Y=0)
  const walls = [
    { axis: 'x' as const, pos: -room.width / 2, side: 'min' as const, label: 'Left wall' },
    { axis: 'x' as const, pos: room.width / 2, side: 'max' as const, label: 'Right wall' },
    { axis: 'z' as const, pos: -room.depth / 2, side: 'min' as const, label: 'Back wall' },
    { axis: 'z' as const, pos: room.depth / 2, side: 'max' as const, label: 'Front wall' },
  ];

  const labels: DistanceLabel[] = [];
  const S = 0.001; // mmToWorld scale

  // AABB per piece (computed once)
  const aabbs = new Map<string, { min: Vec3; max: Vec3 }>();
  for (const piece of pieces) {
    if (piece.isFixture) continue;
    aabbs.set(piece.id, getPieceAABB(piece));
  }

  // --- Wall distances for each piece ---
  for (const piece of pieces) {
    if (piece.isFixture) continue;
    const aabb = aabbs.get(piece.id)!;
    // Label Y: slightly above piece top
    const labelY = aabb.max[1] + 50;

    for (const wall of walls) {
      const axisIdx = wall.axis === 'x' ? 0 : 2;
      let dist: number;

      if (wall.side === 'min') {
        // Wall is at negative side (e.g. left wall at -width/2)
        // Distance from piece's min face to the wall
        dist = aabb.min[axisIdx] - wall.pos;
      } else {
        // Wall is at positive side (e.g. right wall at +width/2)
        // Distance from wall to piece's max face
        dist = wall.pos - aabb.max[axisIdx];
      }

      // Skip if piece extends past the wall (negative distance) or distance is too large
      if (dist < 0) continue;
      // Skip zero distances (piece touching the wall)
      if (dist < 1) continue;

      // Position the dimension line along the relevant axis
      const otherAxisIdx = wall.axis === 'x' ? 2 : 0; // Z for X-walls, X for Z-walls
      const pieceCenterOther = (aabb.min[otherAxisIdx] + aabb.max[otherAxisIdx]) / 2;

      let lineStart: [number, number, number];
      let lineEnd: [number, number, number];
      let textPos: [number, number, number];

      if (wall.axis === 'x') {
        // Horizontal line at the piece's Z center, from piece edge to wall
        const zCenter = pieceCenterOther;
        lineStart = [wall.side === 'min' ? aabb.min[0] : aabb.max[0], labelY, zCenter];
        lineEnd = [wall.pos, labelY, zCenter];
        const midX = (lineStart[0] + lineEnd[0]) / 2;
        textPos = [midX, labelY, zCenter];
      } else {
        // Depth line at the piece's X center, from piece edge to wall
        const xCenter = pieceCenterOther;
        lineStart = [xCenter, labelY, wall.side === 'min' ? aabb.min[2] : aabb.max[2]];
        lineEnd = [xCenter, labelY, wall.pos];
        const midZ = (lineStart[2] + lineEnd[2]) / 2;
        textPos = [xCenter, labelY, midZ];
      }

      // Convert all positions to world units
      const wLinePoints: [number, number, number][] = [
        [lineStart[0] * S, lineStart[1] * S, lineStart[2] * S],
        [lineEnd[0] * S, lineEnd[1] * S, lineEnd[2] * S],
      ];
      const wTextPos: [number, number, number] = [
        textPos[0] * S, textPos[1] * S, textPos[2] * S,
      ];

      labels.push({
        linePoints: wLinePoints,
        textPos: wTextPos,
        text: `${Math.round(dist)} mm`,
        color: '#ffdd00',
      });
    }
  }

  // --- Neighbor distances (axis-aligned gaps) ---
  const neighborThreshold = 500; // mm — only show neighbors within this gap
  const furniturePieces = pieces.filter((p) => !p.isFixture);

  for (let i = 0; i < furniturePieces.length; i++) {
    const pieceA = furniturePieces[i];
    const aabbA = aabbs.get(pieceA.id)!;

    for (let j = i + 1; j < furniturePieces.length; j++) {
      const pieceB = furniturePieces[j];
      const aabbB = aabbs.get(pieceB.id)!;

      // Check X-axis gap
      const xGap = Math.max(
        aabbA.min[0] - aabbB.max[0],
        aabbB.min[0] - aabbA.max[0],
        0,
      );

      // Check Z-axis gap
      const zGap = Math.max(
        aabbA.min[2] - aabbB.max[2],
        aabbB.min[2] - aabbA.max[2],
        0,
      );

      // They're axis-aligned neighbors if they overlap on one axis and have a small gap on the other
      const yOverlap = aabbA.min[1] < aabbB.max[1] && aabbA.max[1] > aabbB.min[1];

      // Check if pieces overlap (or nearly overlap) on X -> show Z gap
      const xOverlap = aabbA.min[0] <= aabbB.max[0] && aabbA.max[0] >= aabbB.min[0];
      // Check if pieces overlap (or nearly overlap) on Z -> show X gap
      const zOverlap = aabbA.min[2] <= aabbB.max[2] && aabbA.max[2] >= aabbB.min[2];

      const labelYA = aabbA.max[1] + 30;
      const labelYB = aabbB.max[1] + 30;
      const labelY = Math.max(labelYA, labelYB);

      // Show X-axis gap when pieces overlap on Z
      if (zOverlap && xGap > 0 && xGap <= neighborThreshold && yOverlap) {
        // Find the X boundary where they're closest
        const aOnLeft = aabbA.max[0] <= aabbB.min[0]; // A is to the left of B
        const edgeAx = aOnLeft ? aabbA.max[0] : aabbA.min[0]; // A's facing edge
        const edgeBx = aOnLeft ? aabbB.min[0] : aabbB.max[0]; // B's facing edge
        const zCenter = (Math.max(aabbA.min[2], aabbB.min[2]) + Math.min(aabbA.max[2], aabbB.max[2])) / 2;

        const lineStart: [number, number, number] = [edgeAx * S, labelY * S, zCenter * S];
        const lineEnd: [number, number, number] = [edgeBx * S, labelY * S, zCenter * S];
        const midX = (edgeAx + edgeBx) / 2;
        const textPos: [number, number, number] = [midX * S, labelY * S, zCenter * S];

        labels.push({
          linePoints: [lineStart, lineEnd],
          textPos,
          text: `${Math.round(xGap)} mm`,
          color: '#00ddff',
        });
      }

      // Show Z-axis gap when pieces overlap on X
      if (xOverlap && zGap > 0 && zGap <= neighborThreshold && yOverlap) {
        const aInFront = aabbA.max[2] <= aabbB.min[2]; // A is in front of B (toward front wall)
        const edgeAz = aInFront ? aabbA.max[2] : aabbA.min[2];
        const edgeBz = aInFront ? aabbB.min[2] : aabbB.max[2];
        const xCenter = (Math.max(aabbA.min[0], aabbB.min[0]) + Math.min(aabbA.max[0], aabbB.max[0])) / 2;

        const lineStart: [number, number, number] = [xCenter * S, labelY * S, edgeAz * S];
        const lineEnd: [number, number, number] = [xCenter * S, labelY * S, edgeBz * S];
        const midZ = (edgeAz + edgeBz) / 2;
        const textPos: [number, number, number] = [xCenter * S, labelY * S, midZ * S];

        labels.push({
          linePoints: [lineStart, lineEnd],
          textPos,
          text: `${Math.round(zGap)} mm`,
          color: '#00ddff',
        });
      }
    }
  }

  return (
    <>
      {labels.map((label, i) => (
        <group key={i}>
          <Line
            points={label.linePoints}
            color={label.color}
            lineWidth={1.5}
            transparent
            opacity={0.8}
          />
          <Text
            position={label.textPos}
            fontSize={S * 30}
            color={label.color}
            anchorX="center"
            anchorY="middle"
            outlineWidth={S * 3}
            outlineColor="#000000"
          >
            {label.text}
          </Text>
        </group>
      ))}
    </>
  );
}