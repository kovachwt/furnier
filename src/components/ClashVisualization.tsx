import { useStore } from '../store/useStore';
import { mmToWorld } from './room/RoomBox';
import { useClashDetection } from '../hooks/useClashDetection';
import { computePieceAABB } from '../utils/clashDetection';
import * as THREE from 'three';

/**
 * Renders red translucent bounding boxes around pieces that are
 * in clash with at least one other piece.
 *
 * Each piece is rendered using its own AABB (computed with full
 * component-rotation awareness via computePieceAABB).
 * Only renders when `showClashDetection` is enabled.
 */
export function ClashVisualization() {
  const clashPairs = useClashDetection();
  const pieces = useStore((s) => s.project.pieces);

  if (clashPairs.length === 0) return null;

  // Collect all unique piece IDs involved in any clash
  const clashIds = new Set<string>();
  for (const { pieceA, pieceB } of clashPairs) {
    clashIds.add(pieceA);
    clashIds.add(pieceB);
  }

  return (
    <>
      {Array.from(clashIds).map((pieceId) => {
        const piece = pieces.find(p => p.id === pieceId);
        if (!piece) return null;
        const aabb = computePieceAABB(piece);
        return <ClashBox key={pieceId} aabb={aabb} />;
      })}
    </>
  );
}

interface ClashBoxProps {
  aabb: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}

function ClashBox({ aabb }: ClashBoxProps) {
  const w = mmToWorld(aabb.maxX - aabb.minX);
  const h = mmToWorld(aabb.maxY - aabb.minY);
  const d = mmToWorld(aabb.maxZ - aabb.minZ);
  const cx = mmToWorld(aabb.minX + (aabb.maxX - aabb.minX) / 2);
  const cy = mmToWorld(aabb.minY + (aabb.maxY - aabb.minY) / 2);
  const cz = mmToWorld(aabb.minZ + (aabb.maxZ - aabb.minZ) / 2);

  return (
    <group position={[cx, cy, cz]}>
      {/* Translucent face overlay */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshBasicMaterial
          color="#ff3344"
          transparent
          opacity={0.12}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Wireframe edges */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#ff3344" linewidth={2} />
      </lineSegments>
    </group>
  );
}
