import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Line } from '@react-three/drei';
import { useStore } from '../store/useStore';
import { RoomBox, mmToWorld } from './room/RoomBox';
import { PieceDistances } from './room/PieceDistances';
import { FurniturePieceMesh } from './furniture/FurniturePieceMesh';
import { KeyboardCameraControls } from './KeyboardCameraControls';
import { CameraAnimator } from './CameraAnimator';
import { ViewportCapture } from './ViewportCapture';
import { ClashVisualization } from './ClashVisualization';
import type { FurniturePiece } from '../types';
import { getPiecesWorldBounds } from '../utils/alignment';
import { computePieceAABB } from '../utils/clashDetection';

/**
 * World-space center X/Z of a piece (mm), rotation-aware via
 * `computePieceAABB`. Used by SmartGuides for center-alignment lines —
 * previously this averaged component positions and ignored the
 * piece's yaw rotation, so a rotated asymmetric piece drew its guide
 * through the wrong point.
 */
function getPieceWorldCenterXZ(piece: FurniturePiece): { cx: number; cz: number } {
  const a = computePieceAABB(piece);
  return { cx: (a.minX + a.maxX) / 2, cz: (a.minZ + a.maxZ) / 2 };
}

/**
 * Wireframe bounding box around all selected pieces. Visible only when
 * 2+ pieces are selected. Renders a 12-edge AABB at a slightly raised
 * Y offset so it doesn't z-fight with the floor.
 */
function MultiSelectBounds() {
  const selectedPieceIds = useStore((s) => s.selectedPieceIds);
  const pieces = useStore((s) => s.project.pieces);

  if (selectedPieceIds.length < 2) return null;

  const selectedPieces = pieces.filter((p) => selectedPieceIds.includes(p.id));
  if (selectedPieces.length < 2) return null;

  const bounds = getPiecesWorldBounds(selectedPieces);
  const minX = mmToWorld(bounds.min[0]);
  const minY = mmToWorld(Math.max(0, bounds.min[1]));
  const minZ = mmToWorld(bounds.min[2]);
  const maxX = mmToWorld(bounds.max[0]);
  const maxY = mmToWorld(bounds.max[1]);
  const maxZ = mmToWorld(bounds.max[2]);

  // 12 edges of an axis-aligned box
  const edges: [number, number, number][][] = [
    // bottom rectangle
    [[minX, minY, minZ], [maxX, minY, minZ]],
    [[maxX, minY, minZ], [maxX, minY, maxZ]],
    [[maxX, minY, maxZ], [minX, minY, maxZ]],
    [[minX, minY, maxZ], [minX, minY, minZ]],
    // top rectangle
    [[minX, maxY, minZ], [maxX, maxY, minZ]],
    [[maxX, maxY, minZ], [maxX, maxY, maxZ]],
    [[maxX, maxY, maxZ], [minX, maxY, maxZ]],
    [[minX, maxY, maxZ], [minX, maxY, minZ]],
    // vertical edges
    [[minX, minY, minZ], [minX, maxY, minZ]],
    [[maxX, minY, minZ], [maxX, maxY, minZ]],
    [[maxX, minY, maxZ], [maxX, maxY, maxZ]],
    [[minX, minY, maxZ], [minX, maxY, maxZ]],
  ];

  return (
    <>
      {edges.map((pts, i) => (
        <Line
          key={i}
          points={pts}
          color="#60a5fa"
          lineWidth={1.5}
          transparent
          opacity={0.7}
        />
      ))}
      {/* Centroid marker — a small cross at the combined center on the floor */}
      <Line
        points={[
          [mmToWorld(bounds.center[0]) - 0.05, minY + 0.001, mmToWorld(bounds.center[2])],
          [mmToWorld(bounds.center[0]) + 0.05, minY + 0.001, mmToWorld(bounds.center[2])],
        ]}
        color="#60a5fa"
        lineWidth={2}
        transparent
        opacity={0.9}
      />
      <Line
        points={[
          [mmToWorld(bounds.center[0]), minY + 0.001, mmToWorld(bounds.center[2]) - 0.05],
          [mmToWorld(bounds.center[0]), minY + 0.001, mmToWorld(bounds.center[2]) + 0.05],
        ]}
        color="#60a5fa"
        lineWidth={2}
        transparent
        opacity={0.9}
      />
    </>
  );
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

  const { cx, cz } = getPieceWorldCenterXZ(selectedPiece);
  const worldCx = mmToWorld(cx);
  const worldCz = mmToWorld(cz);

  // Find neighbors whose center aligns with selected piece's center (within 10mm)
  const alignThreshold = 10;
  const alignedNeighbors: string[] = [];

  for (const other of pieces) {
    if (other.id === selectedPieceId || other.isFixture) continue;
    const { cx: ocx, cz: ocz } = getPieceWorldCenterXZ(other);
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
        const { cx: ncx, cz: ncz } = getPieceWorldCenterXZ(neighbor);
        const nwx = ncx;
        const nwz = ncz;
        return (
          <group key={neighborId}>
            {/* Vertical line through neighbor center */}
            <Line
              points={[[mmToWorld(nwx), 0, -hd], [mmToWorld(nwx), h, -hd]]}
              color="#ff00ff"
              lineWidth={1}
              transparent
              opacity={0.3}
            />
            {/* Horizontal line through neighbor center */}
            <Line
              points={[[hw, 0, mmToWorld(nwz)], [-hw, 0, mmToWorld(nwz)]]}
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

/**
 * Expose the R3F camera, the default OrbitControls, and the scene —
 * `window.__camera` / `window.__controls` / `window.__scene` — same
 * pattern as `window.__store` in App.tsx. Used by the Playwright suite
 * to assert / restore camera position and to locate rendered overlays
 * (e.g. distance labels) in the scene graph, plus ad-hoc devtools
 * debugging.
 */
function CameraExpose() {
  const camera = useThree((s) => s.camera);
  const controls = useThree((s) => s.controls);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    (window as unknown as { __camera?: unknown }).__camera = camera;
    (window as unknown as { __controls?: unknown }).__controls = controls;
    (window as unknown as { __scene?: unknown }).__scene = scene;
  }, [camera, controls, scene]);
  return null;
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
      <MultiSelectBounds />
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
      <CameraExpose />
      <Suspense fallback={null}>
        <PieceDistances />
      </Suspense>
    </Canvas>
  );
}
