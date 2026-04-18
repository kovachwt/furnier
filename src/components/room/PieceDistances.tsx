import { Text } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { mmToWorld } from './RoomBox';
import type { FurniturePiece, Vec3 } from '../../types';

/** Compute the axis-aligned bounding box (in mm) for a piece. */
function getPieceAABB(piece: FurniturePiece): {
  min: Vec3;
  max: Vec3;
} {
  let minX = Infinity, minY = Infinity, minZ = Infinity;
  let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

  for (const comp of piece.components) {
    const cx = comp.position[0];
    const cy = comp.position[1];
    const cz = comp.position[2];

    let hw = 10, hh = 10, hd = 10;
    if (comp.type === 'panel') {
      hw = comp.width / 2;
      hh = comp.height / 2;
      hd = comp.depth / 2;
    } else if (comp.type === 'leg') {
      hw = comp.diameter / 2;
      hh = comp.height;
      hd = comp.diameter / 2;
    } else {
      hw = 20;
      hh = 20;
      hd = 20;
    }

    minX = Math.min(minX, cx - hw);
    minY = Math.min(minY, cy);
    minZ = Math.min(minZ, cz - hd);
    maxX = Math.max(maxX, cx + hw);
    maxY = Math.max(maxY, cy + hh);
    maxZ = Math.max(maxZ, cz + hd);
  }

  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

/** Distance from piece AABB to a wall plane. */
function distToWall(aabbMin: Vec3, aabbMax: Vec3, wall: { axis: 'x' | 'z'; pos: number }): number {
  if (wall.axis === 'x') {
    return wall.pos > 0 ? wall.pos - aabbMax[0] : aabbMin[0] - wall.pos;
  }
  return wall.pos > 0 ? wall.pos - aabbMax[2] : aabbMin[2] - wall.pos;
}

export function PieceDistances() {
  const showDistances = useStore((s) => s.showDistances);
  const pieces = useStore((s) => s.project.pieces);
  const room = useStore((s) => s.project.room);

  if (!showDistances || pieces.length === 0) return null;

  // Wall planes: left(-x), right(+x), back(-z), front(+z), floor(0), ceiling(room.height)
  const walls = [
    { axis: 'x' as const, pos: -room.width / 2, label: 'left wall' },
    { axis: 'x' as const, pos: room.width / 2, label: 'right wall' },
    { axis: 'z' as const, pos: -room.depth / 2, label: 'back wall' },
    { axis: 'z' as const, pos: room.depth / 2, label: 'front wall' },
  ];

  const distanceLabels: {
    position: [number, number, number];
    text: string;
    color: string;
  }[] = [];

  for (const piece of pieces) {
    if (piece.isFixture) continue;

    const aabb = getPieceAABB(piece);
    let closestDist = Infinity;
    let closestLabel = '';

    // Check distance to walls
    for (const wall of walls) {
      const d = distToWall(aabb.min, aabb.max, wall);
      if (d < closestDist && d >= 0) {
        closestDist = d;
        closestLabel = `${d} mm`;
      }
    }

    // Check distance to other pieces
    for (const other of pieces) {
      if (other.id === piece.id || other.isFixture) continue;
      const otherAABB = getPieceAABB(other);

      // AABB overlap check in 2D (XZ plane) for non-overlapping pieces
      const xOverlap = aabb.min[0] <= otherAABB.max[0] && aabb.max[0] >= otherAABB.min[0];
      const zOverlap = aabb.min[2] <= otherAABB.max[2] && aabb.max[2] >= otherAABB.min[2];

      if (!xOverlap || !zOverlap) {
        // Distance is the gap between AABBs
        const dx = xOverlap ? 0 : Math.min(Math.abs(aabb.max[0] - otherAABB.min[0]), Math.abs(otherAABB.max[0] - aabb.min[0]));
        const dz = zOverlap ? 0 : Math.min(Math.abs(aabb.max[2] - otherAABB.min[2]), Math.abs(otherAABB.max[2] - aabb.min[2]));
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < closestDist) {
          closestDist = d;
          closestLabel = `${d} mm`;
        }
      }
    }

    if (closestLabel && closestDist > 0) {
      // Position label above the piece center
      const pieceCenter: Vec3 = [
        (aabb.min[0] + aabb.max[0]) / 2,
        aabb.max[1] + 40,
        (aabb.min[2] + aabb.max[2]) / 2,
      ];

      distanceLabels.push({
        position: [mmToWorld(pieceCenter[0]), mmToWorld(pieceCenter[1]), mmToWorld(pieceCenter[2])],
        text: closestLabel,
        color: '#ffdd00',
      });
    }
  }

  return (
    <>
      {distanceLabels.map((label, i) => (
        <Text
          key={i}
          position={label.position}
          fontSize={mmToWorld(30)}
          color={label.color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={mmToWorld(3)}
          outlineColor="#000000"
        >
          {label.text}
        </Text>
      ))}
    </>
  );
}
