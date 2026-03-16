import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { RoomBox } from './room/RoomBox';
import { FurniturePieceMesh } from './furniture/FurniturePieceMesh';

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
