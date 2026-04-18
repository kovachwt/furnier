import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { RoomBox, mmToWorld } from './room/RoomBox';
import { PieceDistances } from './room/PieceDistances';
import { FurniturePieceMesh } from './furniture/FurniturePieceMesh';
import { KeyboardCameraControls } from './KeyboardCameraControls';
import { CameraAnimator } from './CameraAnimator';
import { ViewportCapture } from './ViewportCapture';
import { ClashVisualization } from './ClashVisualization';
import type { Vec3 } from '../types';

/** Compute the center X/Z of a piece's AABB in mm. */
function getPieceCenter(piece: { components: Array<{ position: Vec3; type: string; width?: number; height?: number; depth?: number; diameter?: number }> }): { cx: number; cz: number } {
  let cx = 0, cz = 0, n = 0;
  for (const comp of piece.components) {
    cx += comp.position[0];
    cz += comp.position[2];
    n++;
  }
  return n > 0 ? { cx: cx / n, cz: cz / n } : { cx: 0, cz: 0 };
}

/** Smart guides: show magenta center-alignment lines for the selected piece. */
function SmartGuides() {
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const pieces = useStore((s) => s.project.pieces);
  const room = useStore((s) => s.project.room);

  if (!selectedPieceId) return null;

  const hw = mmToWorld(room.width / 2);
  const hd = mmToWorld(room.depth / 2);
  const h = mmToWorld(room.height);

  const selectedPiece = pieces.find(p => p.id === selectedPieceId);
  if (!selectedPiece) return null;

  const { cx, cz } = getPieceCenter(selectedPiece);
  const worldCx = mmToWorld(cx);
  const worldCz = mmToWorld(cz);

  // Find neighbors whose center aligns with selected piece's center (within 10mm)
  const alignThreshold = 10;
  const alignedNeighbors: string[] = [];

  for (const other of pieces) {
    if (other.id === selectedPieceId || other.isFixture) continue;
    const { cx: ocx, cz: ocz } = getPieceCenter(other);
    const dx = Math.abs(ocx - cx);
    const dz = Math.abs(ocz - cz);
    if (dx < alignThreshold || dz < alignThreshold) {
      alignedNeighbors.push(other.id);
    }
  }

  return (
    <>
      {/* Vertical center line (X) — full height, across back wall and floor */}
      <Line
        points={[[worldCx, 0, -hd], [worldCx, h, -hd]]}
        color="#ff00ff"
        lineWidth={1}
        transparent
        opacity={0.5}
      />
      <Line
        points={[[worldCx, 0, -hd], [worldCx, 0, hd]]}
        color="#ff00ff"
        lineWidth={1}
        transparent
        opacity={0.5}
      />

      {/* Horizontal center line (Z) — full depth, across floor and left wall */}
      <Line
        points={[[hw, 0, worldCz], [-hw, 0, worldCz]]}
        color="#ff00ff"
        lineWidth={1}
        transparent
        opacity={0.5}
      />
      <Line
        points={[[hw, 0, worldCz], [hw, h, worldCz]]}
        color="#ff00ff"
        lineWidth={1}
        transparent
        opacity={0.5}
      />

      {/* Highlight aligned neighbors */}
      {alignedNeighbors.map((neighborId) => {
        const neighbor = pieces.find(p => p.id === neighborId);
        if (!neighbor) return null;
        const { cx: ncx, cz: ncz } = getPieceCenter(neighbor);
        return (
          <group key={neighborId}>
            {/* Vertical line through neighbor center */}
            <Line
              points={[[mmToWorld(ncx), 0, -hd], [mmToWorld(ncx), h, -hd]]}
              color="#ff00ff"
              lineWidth={1}
              transparent
              opacity={0.3}
            />
            {/* Horizontal line through neighbor center */}
            <Line
              points={[[hw, 0, mmToWorld(ncz)], [-hw, 0, mmToWorld(ncz)]]}
              color="#ff00ff"
              lineWidth={1}
              transparent
              opacity={0.3}
            />
          </group>
        );
      })}
    </>
  );
}

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
      style={{ background: 'var(--bg-primary)' }}
      // preserveDrawingBuffer keeps the backbuffer available between
      // frames. Required for:
      //   • canvas.toDataURL() (used by the in-app Screenshot button)
      //   • Playwright / CDP screenshots that compose a frame mid-cycle
      //   • Any headless browser where the compositor may miss the
      //     most recent WebGL paint
      // A single-digit-percent perf cost in exchange for a viewport
      // that's always capturable — worth it for a design tool.
      gl={{ preserveDrawingBuffer: true }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <directionalLight position={[-3, 4, -3]} intensity={0.3} />

      {/*
       * Scene contents each run in their own Suspense boundary.
       *
       * Why: drei's <Environment> suspends on HDR fetch, and drei's <Text>
       * (used in RoomBox / PieceDistances / FurniturePieceMesh) suspends
       * on font fetch. Without isolation, any one suspension blanks the
       * entire scene subtree — that's the failure mode where the viewport
       * renders as a flat background color until every async asset
       * resolves, which can effectively never happen in a sandboxed
       * headless browser with no network.
       */}
      <Suspense fallback={null}>
        <Environment preset="apartment" />
      </Suspense>

      <Suspense fallback={null}>
        <RoomBox />
      </Suspense>

      {pieces.map((piece) => (
        <Suspense key={piece.id} fallback={null}>
          <FurniturePieceMesh piece={piece} />
        </Suspense>
      ))}

      <SnapGuides />
      <SmartGuides />
      <ClashVisualization />

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={0.5}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2 + 0.1}
        target={[0, 1, 0]}
        // Touch-friendly configuration:
        // 1-finger = orbit (default), 2-finger = zoom+pan
        // Smoother damped rotation on touch devices
        touches={{
          ONE: 0,          // ROTATE
          TWO: 2,          // DOLLY_PAN
        }}
        rotateSpeed={0.8}
        zoomSpeed={0.8}
        panSpeed={0.8}
      />

      <KeyboardCameraControls />
      <CameraAnimator />
      <ViewportCapture />
      <Suspense fallback={null}>
        <PieceDistances />
      </Suspense>
    </Canvas>
  );
}
