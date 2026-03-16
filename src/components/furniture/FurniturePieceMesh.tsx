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

export function FurniturePieceMesh({ piece }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const activeTool = useStore((s) => s.activeTool);
  const explodedView = useStore((s) => s.explodedView);
  const explodeFactor = useStore((s) => s.explodeFactor);

  const isSelected = selectedPieceId === piece.id;
  const canTransform = isSelected && (activeTool === 'move' || activeTool === 'select') && !explodedView;

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

  // --- Drag handler with snap-to-face ---
  const handleDrag = useCallback((local: THREE.Matrix4) => {
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    local.decompose(pos, rot, scl);

    // Read latest state directly to avoid stale closures
    const state = useStore.getState();
    const { room } = state.project;
    const allPieces = state.project.pieces;

    let newPos: [number, number, number] = [
      worldToMm(pos.x),
      worldToMm(pos.y),
      worldToMm(pos.z),
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
        return (
          <group
            key={comp.id}
            ref={(el) => { if (el) explodeGroupRefs.current.set(comp.id, el); }}
          >
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

  if (canTransform && !piece.locked) {
    return (
      <PivotControls
        anchor={[0, 0, 0]}
        depthTest={false}
        scale={0.4}
        lineWidth={2}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        offset={[px, py, pz]}
        disableRotations={activeTool === 'move'}
      >
        {inner}
      </PivotControls>
    );
  }

  return inner;
}
