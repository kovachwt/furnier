import { } from 'react';
import { useStore } from '../../store/useStore';
import * as THREE from 'three';
import { Text } from '@react-three/drei';

// Scale factor: internal mm → Three.js units (1 unit = 1mm would be huge, so 1 unit = 100mm = 10cm)
const S = 0.001; // mm to meters for Three.js

export const mmToWorld = (mm: number) => mm * S;
export const worldToMm = (world: number) => world / S;

export function RoomBox() {
  const room = useStore((s) => s.project.room);
  const showGrid = useStore((s) => s.showGrid);
  const showDimensions = useStore((s) => s.showDimensions);

  const w = mmToWorld(room.width);
  const h = mmToWorld(room.height);
  const d = mmToWorld(room.depth);

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color="#e8e4de" side={THREE.DoubleSide} />
      </mesh>

      {/* Floor grid */}
      {showGrid && (
        <gridHelper
          args={[Math.max(w, d), Math.max(room.width, room.depth) / 100, '#ccc', '#e0e0e0']}
          position={[0, 0.001, 0]}
        />
      )}

      {/* Walls - transparent with edges */}
      {/* Back wall */}
      <mesh position={[0, h / 2, -d / 2]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color="#f5f2ed" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Left wall */}
      <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial color="#f0ede8" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Right wall */}
      <mesh position={[w / 2, h / 2, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <planeGeometry args={[d, h]} />
        <meshStandardMaterial color="#f0ede8" transparent opacity={0.3} side={THREE.DoubleSide} />
      </mesh>

      {/* Room wireframe outline */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
        <lineBasicMaterial color="#999" />
      </lineSegments>
      <group position={[0, h / 2, 0]}>
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(w, h, d)]} />
          <lineBasicMaterial color="#888" />
        </lineSegments>
      </group>

      {/* Dimension labels */}
      {showDimensions && (
        <>
          {/* Width label */}
          <Text
            position={[0, -0.05, d / 2 + 0.15]}
            fontSize={0.12}
            color="#555"
            anchorX="center"
            anchorY="middle"
          >
            {room.width} mm
          </Text>

          {/* Depth label */}
          <Text
            position={[w / 2 + 0.15, -0.05, 0]}
            fontSize={0.12}
            color="#555"
            anchorX="center"
            anchorY="middle"
            rotation={[0, -Math.PI / 2, 0]}
          >
            {room.depth} mm
          </Text>

          {/* Height label */}
          <Text
            position={[-w / 2 - 0.15, h / 2, -d / 2]}
            fontSize={0.12}
            color="#555"
            anchorX="center"
            anchorY="middle"
            rotation={[0, 0, Math.PI / 2]}
          >
            {room.height} mm
          </Text>
        </>
      )}
    </group>
  );
}
