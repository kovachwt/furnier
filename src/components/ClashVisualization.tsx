import { useStore } from '../store/useStore';
import { mmToWorld } from './room/RoomBox';
import { useClashDetection } from '../hooks/useClashDetection';
import * as THREE from 'three';

/**
 * Renders red translucent bounding boxes around pieces that are
 * in clash with at least one other piece.
 *
 * Uses a single merged AABB per piece for a clean outline.
 * Only renders when `showClashDetection` is enabled.
 */
export function ClashVisualization() {
  const clashPairs = useClashDetection();
  const pieces = useStore((s) => s.project.pieces);

  if (clashPairs.length === 0) return null;

  // Collect all piece IDs that are involved in any clash
  const clashIds = new Set<string>();
  for (const { pieceA, pieceB } of clashPairs) {
    clashIds.add(pieceA);
    clashIds.add(pieceB);
  }

  // Compute merged AABB for each clashing piece (in case a piece clashes with multiple others)
  const mergedAABB = new Map<string, { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }>();

  for (const pieceId of clashIds) {
    const piece = pieces.find(p => p.id === pieceId);
    if (!piece) continue;

    let merged = {
      minX: Infinity, maxX: -Infinity,
      minY: Infinity, maxY: -Infinity,
      minZ: Infinity, maxZ: -Infinity,
    };

    // Gather all AABBs for this piece (from each clash pair it's in)
    for (const pair of clashPairs) {
      if (pair.pieceA === pieceId) {
        const other = pieces.find(p => p.id === pair.pieceB);
        if (!other) continue;
        merged = mergeAABB(merged, computePieceAABB(piece), computePieceAABB(other));
      } else if (pair.pieceB === pieceId) {
        const other = pieces.find(p => p.id === pair.pieceA);
        if (!other) continue;
        merged = mergeAABB(merged, computePieceAABB(piece), computePieceAABB(other));
      }
    }

    mergedAABB.set(pieceId, merged);
  }

  return (
    <>
      {Array.from(mergedAABB.entries()).map(([pieceId, aabb]) => (
        <ClashBox
          key={pieceId}
          aabb={aabb}
          clashCount={clashPairs.filter(p => p.pieceA === pieceId || p.pieceB === pieceId).length}
        />
      ))}
    </>
  );
}

/** Merge two AABBs into one. */
function mergeAABB(
  a: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
  b: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
  c: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number },
): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } {
  return {
    minX: Math.min(a.minX, b.minX, c.minX),
    maxX: Math.max(a.maxX, b.maxX, c.maxX),
    minY: Math.min(a.minY, b.minY, c.minY),
    maxY: Math.max(a.maxY, b.maxY, c.maxY),
    minZ: Math.min(a.minZ, b.minZ, c.minZ),
    maxZ: Math.max(a.maxZ, b.maxZ, c.maxZ),
  };
}

/** Compute the AABB of a single piece (re-exported for use in visualization). */
function computePieceAABB(piece: {
  id: string;
  name: string;
  position: [number, number, number];
  rotation: [number, number, number];
  components: Array<{
    type: string;
    position: [number, number, number];
    width?: number;
    height?: number;
    depth?: number;
    diameter?: number;
  }>;
  locked: boolean;
}): { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number } {
  const [, ry] = piece.rotation;
  const cosA = Math.cos(ry);
  const sinA = Math.sin(ry);

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;

  for (const comp of piece.components) {
    const [px, py, pz] = comp.position;

    let lminX: number, lmaxX: number, lminZ: number, lmaxZ: number;

    switch (comp.type) {
      case 'panel': {
        const w = comp.width!;
        const d = comp.depth!;
        lminX = px - w / 2;
        lmaxX = px + w / 2;
        lminZ = pz - d / 2;
        lmaxZ = pz + d / 2;
        break;
      }
      case 'leg': {
        const r = (comp.diameter ?? 40) / 2;
        lminX = px - r;
        lmaxX = px + r;
        lminZ = pz - r;
        lmaxZ = pz + r;
        break;
      }
      case 'handle': {
        const r = (comp.diameter ?? 25) / 2;
        lminX = px - r;
        lmaxX = px + r;
        lminZ = pz - r;
        lmaxZ = pz + r;
        break;
      }
      default: {
        lminX = px;
        lmaxX = px;
        lminZ = pz;
        lmaxZ = pz;
        break;
      }
    }

    // Rotate corners by piece's Y rotation
    const corners: [number, number][] = [
      [lminX, lminZ], [lmaxX, lminZ],
      [lminX, lmaxZ], [lmaxX, lmaxZ],
    ];

    for (const [lx, lz] of corners) {
      const wx = piece.position[0] + lx * cosA - lz * sinA;
      const wz = piece.position[2] + lx * sinA + lz * cosA;
      if (wx < minX) minX = wx;
      if (wx > maxX) maxX = wx;
      if (wz < minZ) minZ = wz;
      if (wz > maxZ) maxZ = wz;
    }

    // Y bounds
    const compMinY = comp.type === 'panel' ? py - comp.height! / 2 : py - (comp.type === 'leg' ? (comp.height ?? 0) / 2 : 5);
    const compMaxY = comp.type === 'panel' ? py + comp.height! / 2 : py + (comp.type === 'leg' ? (comp.height ?? 0) / 2 : 5);
    if (compMinY < minY) minY = compMinY;
    if (compMaxY > maxY) maxY = compMaxY;
  }

  return { minX, minY, minZ, maxX, maxY, maxZ };
}

interface ClashBoxProps {
  aabb: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
  clashCount: number;
}

function ClashBox({ aabb }: ClashBoxProps) {
  const darkTheme = useStore((s) => s.darkTheme);

  const w = mmToWorld(aabb.maxX - aabb.minX);
  const h = mmToWorld(aabb.maxY - aabb.minY);
  const d = mmToWorld(aabb.maxZ - aabb.minZ);
  const cx = mmToWorld(aabb.minX + (aabb.maxX - aabb.minX) / 2);
  const cy = mmToWorld(aabb.minY + (aabb.maxY - aabb.minY) / 2);
  const cz = mmToWorld(aabb.minZ + (aabb.maxZ - aabb.minZ) / 2);

  // Red for dark theme, orange-red for light theme
  const edgeColor = darkTheme ? '#ff3344' : '#e04020';
  const faceColor = darkTheme ? '#ff3344' : '#e04020';

  return (
    <group>
      {/* Translucent face overlay */}
      <mesh position={[cx, cy, cz]}>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial
          color={faceColor}
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color={edgeColor} linewidth={2} />
      </lineSegments>

      {/* Clash count label */}
      <mesh position={[cx, cy + h / 2 + 0.06, cz]}>
        <boxGeometry args={[0.12, 0.06, 0.005]} />
        <meshBasicMaterial color={edgeColor} />
      </mesh>
    </group>
  );
}
