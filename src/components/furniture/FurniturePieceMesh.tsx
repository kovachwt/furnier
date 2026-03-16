import { useRef, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import { PivotControls, Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import type { FurniturePiece, Vec3, Component } from '../../types';
import { useStore } from '../../store/useStore';
import { mmToWorld, worldToMm } from '../room/RoomBox';
import { PanelMesh } from './PanelMesh';
import { LegMesh } from './LegMesh';
import { HardwareMesh } from './HardwareMesh';
import { snapToGrid, collectSnapTargets, snapPieceToFaces } from '../../utils/snap';

interface Props {
  piece: FurniturePiece;
}

function getComponentHeight(comp: Component): number {
  if (comp.type === 'panel') return Math.max(comp.width, comp.height);
  if (comp.type === 'leg') return comp.height;
  return 20;
}

/** Get the dimensions that can be scaled (excludes panel depth / thickness) */
function getScalableDims(comp: Component): Record<string, number> {
  if (comp.type === 'panel') return { width: comp.width, height: comp.height };
  if (comp.type === 'leg') return { diameter: comp.diameter, height: comp.height };
  if (comp.type === 'drawer-slide') return { length: comp.length };
  return {};
}

/**
 * Compute scaled dimensions accounting for component rotation.
 * Maps parent-space scale axes to the component's local axes so that
 * the correct dimension is scaled regardless of rotation — and panel
 * depth (thickness) is never touched.
 */
function computeScaledDims(
  savedDims: Record<string, number>,
  parentScale: THREE.Vector3,
  rotation: Vec3,
): Record<string, number> {
  const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2]);
  const localX = new THREE.Vector3(1, 0, 0).applyEuler(euler);
  const localY = new THREE.Vector3(0, 1, 0).applyEuler(euler);
  const localZ = new THREE.Vector3(0, 0, 1).applyEuler(euler);

  // Effective scale along each local axis
  const sxLocal = new THREE.Vector3(
    localX.x * parentScale.x, localX.y * parentScale.y, localX.z * parentScale.z,
  ).length();
  const syLocal = new THREE.Vector3(
    localY.x * parentScale.x, localY.y * parentScale.y, localY.z * parentScale.z,
  ).length();
  const szLocal = new THREE.Vector3(
    localZ.x * parentScale.x, localZ.y * parentScale.y, localZ.z * parentScale.z,
  ).length();

  const result: Record<string, number> = {};
  // width = local X,  height = local Y  (depth / thickness = local Z, excluded)
  if (savedDims.width !== undefined) result.width = Math.max(1, Math.round(savedDims.width * sxLocal));
  if (savedDims.height !== undefined) result.height = Math.max(1, Math.round(savedDims.height * syLocal));
  // leg diameter — average XZ plane scale (cross-section is circular)
  if (savedDims.diameter !== undefined) result.diameter = Math.max(1, Math.round(savedDims.diameter * (sxLocal + szLocal) / 2));
  // drawer-slide length along local Z
  if (savedDims.length !== undefined) result.length = Math.max(1, Math.round(savedDims.length * szLocal));
  return result;
}

export function FurniturePieceMesh({ piece }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const activeTool = useStore((s) => s.activeTool);
  const explodedView = useStore((s) => s.explodedView);
  const explodeFactor = useStore((s) => s.explodeFactor);

  const isSelected = selectedPieceId === piece.id;
  const hasComponentSelected = isSelected && selectedComponentId != null &&
    piece.components.some(c => c.id === selectedComponentId);
  const canTransformPiece = isSelected && !hasComponentSelected &&
    (activeTool === 'move' || activeTool === 'select') && !explodedView;
  const canTransformComponent = isSelected && hasComponentSelected &&
    (activeTool === 'move' || activeTool === 'select') && !explodedView && !piece.locked;

  // --- Exploded view animation ---
  const explodeGroupRefs = useRef<Map<string, THREE.Group>>(new Map());
  const currentExplode = useRef(0);
  const targetExplode = explodedView ? explodeFactor : 0;

  const center = useMemo(() => {
    const n = piece.components.length;
    if (n === 0) return [0, 0, 0] as Vec3;
    const sum = piece.components.reduce(
      (acc, c) => [acc[0] + c.position[0], acc[1] + c.position[1], acc[2] + c.position[2]] as Vec3,
      [0, 0, 0] as Vec3
    );
    return [sum[0] / n, sum[1] / n, sum[2] / n] as Vec3;
  }, [piece.components]);

  useFrame((_, delta) => {
    const speed = 5;
    const prev = currentExplode.current;
    currentExplode.current += (targetExplode - prev) * Math.min(1, delta * speed);
    const f = currentExplode.current;

    for (const comp of piece.components) {
      const group = explodeGroupRefs.current.get(comp.id);
      if (group) {
        const dx = comp.position[0] - center[0];
        const dy = comp.position[1] - center[1];
        const dz = comp.position[2] - center[2];
        group.position.set(
          mmToWorld(dx * f),
          mmToWorld(dy * f),
          mmToWorld(dz * f)
        );
      }
    }
  });

  // --- Track drag start position + component data for scaling ---
  const dragStartPosRef = useRef<Vec3>([0, 0, 0]);
  const dragStartComponentsRef = useRef<Array<{ id: string; position: Vec3; dims: Record<string, number> }>>([]);
  const dragScaleCenterRef = useRef<Vec3>([0, 0, 0]);

  const handleDragStart = useCallback(() => {
    const currentPiece = useStore.getState().project.pieces.find(p => p.id === piece.id);
    if (currentPiece) {
      dragStartPosRef.current = [...currentPiece.position] as Vec3;
      // Save component data for piece-level scaling
      dragStartComponentsRef.current = currentPiece.components.map(c => ({
        id: c.id,
        position: [...c.position] as Vec3,
        dims: getScalableDims(c),
      }));
      const n = currentPiece.components.length;
      if (n > 0) {
        dragScaleCenterRef.current = [
          currentPiece.components.reduce((s, c) => s + c.position[0], 0) / n,
          currentPiece.components.reduce((s, c) => s + c.position[1], 0) / n,
          currentPiece.components.reduce((s, c) => s + c.position[2], 0) / n,
        ] as Vec3;
      }
    }
  }, [piece.id]);

  // --- Drag handler with snap-to-face ---
  const handleDrag = useCallback((local: THREE.Matrix4) => {
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    local.decompose(pos, rot, scl);

    const state = useStore.getState();

    // Detect scaling (sphere handles) vs translation (arrow handles)
    const isScaling = Math.abs(scl.x - 1) > 0.01 || Math.abs(scl.y - 1) > 0.01 || Math.abs(scl.z - 1) > 0.01;

    if (isScaling) {
      // Scale all component positions relative to center + scale dimensions
      const center = dragScaleCenterRef.current;
      const saved = dragStartComponentsRef.current;
      const currentPiece = state.project.pieces.find(p => p.id === piece.id);
      if (!currentPiece) return;

      const newComponents = currentPiece.components.map(comp => {
        const s = saved.find(sv => sv.id === comp.id);
        if (!s) return comp;

        const scaledPos: Vec3 = [
          Math.round(center[0] + (s.position[0] - center[0]) * scl.x),
          Math.round(center[1] + (s.position[1] - center[1]) * scl.y),
          Math.round(center[2] + (s.position[2] - center[2]) * scl.z),
        ];
        const dimUpdates = computeScaledDims(s.dims, scl, comp.rotation);
        return { ...comp, position: scaledPos, ...dimUpdates } as Component;
      });

      state.updatePiece(piece.id, { components: newComponents });
      return;
    }

    // --- Translation mode ---
    const { room } = state.project;
    const allPieces = state.project.pieces;

    // local matrix is the drag DELTA from drag start, add to the start position
    const startPos = dragStartPosRef.current;
    let newPos: [number, number, number] = [
      startPos[0] + worldToMm(pos.x),
      startPos[1] + worldToMm(pos.y),
      startPos[2] + worldToMm(pos.z),
    ];

    let snappedInfo: { x?: string; y?: string; z?: string } = {};

    // Snap-to-face first (takes priority)
    if (state.snapToFaces) {
      const targets = collectSnapTargets(room, allPieces, piece.id);
      const result = snapPieceToFaces(newPos, piece, targets, state.snapThreshold);
      newPos = result.snapped;
      snappedInfo = result.snappedAxes;
      state.setActiveSnapLines(result.snapLines);
    } else {
      state.setActiveSnapLines([]);
    }

    // Grid snap for axes that didn't face-snap
    if (state.snapEnabled) {
      if (!snappedInfo.x) newPos[0] = snapToGrid(newPos[0], state.gridSize);
      if (!snappedInfo.y) newPos[1] = snapToGrid(newPos[1], state.gridSize);
      if (!snappedInfo.z) newPos[2] = snapToGrid(newPos[2], state.gridSize);
    }

    // Clamp Y >= 0 (don't go below floor)
    newPos[1] = Math.max(0, newPos[1]);

    state.updatePiece(piece.id, { position: newPos });
  }, [piece.id, piece.components]);

  const handleDragEnd = useCallback(() => {
    const state = useStore.getState();
    state.pushHistory();
    state.setActiveSnapLines([]);
  }, []);

  // --- Component-level drag ---
  const compDragStartRef = useRef<Vec3>([0, 0, 0]);
  const compDragStartDimsRef = useRef<Record<string, number>>({});

  const handleCompDragStart = useCallback(() => {
    const state = useStore.getState();
    const currentPiece = state.project.pieces.find(p => p.id === piece.id);
    if (currentPiece && state.selectedComponentId) {
      const comp = currentPiece.components.find(c => c.id === state.selectedComponentId);
      if (comp) {
        compDragStartRef.current = [...comp.position] as Vec3;
        compDragStartDimsRef.current = getScalableDims(comp);
      }
    }
  }, [piece.id]);

  const handleCompDrag = useCallback((local: THREE.Matrix4) => {
    const state = useStore.getState();
    if (!state.selectedComponentId) return;

    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    local.decompose(pos, rot, scl);

    const isScaling = Math.abs(scl.x - 1) > 0.01 || Math.abs(scl.y - 1) > 0.01 || Math.abs(scl.z - 1) > 0.01;

    if (isScaling) {
      // Scale dimensions only (position unchanged) — rotation-aware, skips thickness
      const currentPiece = state.project.pieces.find(p => p.id === piece.id);
      const comp = currentPiece?.components.find(c => c.id === state.selectedComponentId);
      if (!comp) return;

      const dimUpdates = computeScaledDims(compDragStartDimsRef.current, scl, comp.rotation);
      if (Object.keys(dimUpdates).length > 0) {
        state.updateComponent(piece.id, state.selectedComponentId, dimUpdates as Partial<Component>);
      }
      return;
    }

    // Translation mode
    const startPos = compDragStartRef.current;
    const newPos: Vec3 = [
      startPos[0] + worldToMm(pos.x),
      startPos[1] + worldToMm(pos.y),
      startPos[2] + worldToMm(pos.z),
    ];

    if (state.snapEnabled) {
      newPos[0] = snapToGrid(newPos[0], state.gridSize);
      newPos[1] = snapToGrid(newPos[1], state.gridSize);
      newPos[2] = snapToGrid(newPos[2], state.gridSize);
    }

    state.updateComponent(piece.id, state.selectedComponentId, { position: newPos });
  }, [piece.id]);

  const handleCompDragEnd = useCallback(() => {
    useStore.getState().pushHistory();
  }, []);

  const px = mmToWorld(piece.position[0]);
  const py = mmToWorld(piece.position[1]);
  const pz = mmToWorld(piece.position[2]);

  const inner = (
    <group
      ref={groupRef}
      position={[px, py, pz]}
      rotation={piece.rotation as unknown as THREE.Euler}
    >
      {piece.components.map((comp, index) => {
        const isCompSelected = selectedComponentId === comp.id;

        const meshContent = (
          <>
            {comp.type === 'panel' && (
              <PanelMesh
                panel={comp}
                pieceId={piece.id}
                isSelected={isCompSelected}
                isPieceSelected={isSelected}
              />
            )}
            {comp.type === 'leg' && (
              <LegMesh
                leg={comp}
                pieceId={piece.id}
                isSelected={isCompSelected}
                isPieceSelected={isSelected}
              />
            )}
            {(comp.type === 'hinge' || comp.type === 'drawer-slide' || comp.type === 'shelf-pin') && (
              <HardwareMesh
                component={comp}
                pieceId={piece.id}
                isSelected={isCompSelected}
                isPieceSelected={isSelected}
              />
            )}
          </>
        );

        return (
          <group
            key={comp.id}
            ref={(el) => { if (el) explodeGroupRefs.current.set(comp.id, el); }}
          >
            {isCompSelected && canTransformComponent ? (
              <PivotControls
                anchor={[0, 0, 0]}
                depthTest={false}
                scale={0.25}
                lineWidth={2}
                autoTransform={false}
                onDragStart={handleCompDragStart}
                onDrag={handleCompDrag}
                onDragEnd={handleCompDragEnd}
                disableRotations
              >
                {meshContent}
              </PivotControls>
            ) : (
              meshContent
            )}
            {/* Exploded view label */}
            {explodedView && (
              <Text
                position={[
                  mmToWorld(comp.position[0]),
                  mmToWorld(comp.position[1]) + mmToWorld(getComponentHeight(comp) / 2 + 40),
                  mmToWorld(comp.position[2]),
                ]}
                fontSize={0.03}
                color="#ffffff"
                anchorX="center"
                anchorY="bottom"
                outlineWidth={0.003}
                outlineColor="#000000"
              >
                {`${index + 1}. ${comp.name}`}
              </Text>
            )}
          </group>
        );
      })}
    </group>
  );

  if (canTransformPiece && !piece.locked) {
    return (
      <PivotControls
        anchor={[0, 0, 0]}
        depthTest={false}
        scale={0.4}
        lineWidth={2}
        autoTransform={false}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        disableRotations={activeTool === 'move'}
      >
        {inner}
      </PivotControls>
    );
  }

  return inner;
}
