import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { RoomBox, mmToWorld } from './room/RoomBox';
import { FurniturePieceMesh } from './furniture/FurniturePieceMesh';

function SnapGuides() {
  const activeSnapLines = useStore((s) => s.activeSnapLines);
  const room = useStore((s) => s.project.room);

  if (activeSnapLines.length === 0) return null;

  const hw = mmToWorld(room.width / 2);
  const hd = mmToWorld(room.depth / 2);
  const h = mmToWorld(room.height);

  return (
    <>
      {activeSnapLines.map((snap, i) => {
        const v = mmToWorld(snap.value);
        const lines: [number, number, number][][] = [];

        if (snap.axis === 'x') {
          // Vertical line on back wall + line on floor
          lines.push([[v, 0, -hd], [v, h, -hd]]);
          lines.push([[v, 0, -hd], [v, 0, hd]]);
        } else if (snap.axis === 'y') {
          // Horizontal line on back wall + line on left wall
          lines.push([[-hw, v, -hd], [hw, v, -hd]]);
          lines.push([[-hw, v, -hd], [-hw, v, hd]]);
        } else {
          // Line on floor + line on left wall
          lines.push([[-hw, 0, v], [hw, 0, v]]);
          lines.push([[-hw, 0, v], [-hw, h, v]]);
        }

        return (
          <group key={i}>
            {lines.map((pts, j) => (
              <Line
                key={j}
                points={pts}
                color="#ffdd00"
                lineWidth={1.5}
                transparent
                opacity={0.8}
              />
            ))}
          </group>
        );
      })}
    </>
  );
}

export function Scene() {
  const pieces = useStore((s) => s.project.pieces);
  const clearSelection = useStore((s) => s.clearSelection);

  return (
    <Canvas
      shadows
      camera={{ position: [3, 2.5, 3], fov: 50, near: 0.01, far: 100 }}
      onPointerMissed={clearSelection}
      style={{ background: '#1a1a2e' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-3, 4, -3]} intensity={0.3} />

      <Environment preset="apartment" />

      <RoomBox />

      {pieces.map((piece) => (
        <FurniturePieceMesh key={piece.id} piece={piece} />
      ))}

      <SnapGuides />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={0.5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2 + 0.1}
        target={[0, 1, 0]}
      />
    </Canvas>
  );
}
