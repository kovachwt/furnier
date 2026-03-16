import { useRef, useCallback } from 'react';
import * as THREE from 'three';
import { PivotControls } from '@react-three/drei';
import type { FurniturePiece } from '../../types';
import { useStore } from '../../store/useStore';
import { mmToWorld, worldToMm } from '../room/RoomBox';
import { PanelMesh } from './PanelMesh';
import { LegMesh } from './LegMesh';
import { HardwareMesh } from './HardwareMesh';
import { snapPositionToGrid } from '../../utils/snap';

interface Props {
  piece: FurniturePiece;
}

export function FurniturePieceMesh({ piece }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const selectedPieceId = useStore((s) => s.selectedPieceId);
  const selectedComponentId = useStore((s) => s.selectedComponentId);
  const activeTool = useStore((s) => s.activeTool);
  const updatePiece = useStore((s) => s.updatePiece);
  const pushHistory = useStore((s) => s.pushHistory);
  const snapEnabled = useStore((s) => s.snapEnabled);
  const gridSize = useStore((s) => s.gridSize);

  const isSelected = selectedPieceId === piece.id;
  const canTransform = isSelected && (activeTool === 'move' || activeTool === 'select');

  const handleDrag = useCallback((local: THREE.Matrix4) => {
    const pos = new THREE.Vector3();
    const rot = new THREE.Quaternion();
    const scl = new THREE.Vector3();
    local.decompose(pos, rot, scl);

    let newPos: [number, number, number] = [
      worldToMm(pos.x),
      worldToMm(pos.y),
      worldToMm(pos.z),
    ];

    if (snapEnabled) {
      newPos = snapPositionToGrid(newPos, gridSize);
    }

    // Clamp Y >= 0 (don't go below floor)
    newPos[1] = Math.max(0, newPos[1]);

    updatePiece(piece.id, { position: newPos });
  }, [piece.id, updatePiece, snapEnabled, gridSize]);

  const handleDragEnd = useCallback(() => {
    pushHistory();
  }, [pushHistory]);

  const px = mmToWorld(piece.position[0]);
  const py = mmToWorld(piece.position[1]);
  const pz = mmToWorld(piece.position[2]);

  const inner = (
    <group
      ref={groupRef}
      position={[px, py, pz]}
      rotation={piece.rotation as unknown as THREE.Euler}
    >
      {piece.components.map((comp) => {
        const isCompSelected = selectedComponentId === comp.id;
        switch (comp.type) {
          case 'panel':
            return (
              <PanelMesh
                key={comp.id}
                panel={comp}
                pieceId={piece.id}
                isSelected={isCompSelected}
                isPieceSelected={isSelected}
              />
            );
          case 'leg':
            return (
              <LegMesh
                key={comp.id}
                leg={comp}
                pieceId={piece.id}
                isSelected={isCompSelected}
                isPieceSelected={isSelected}
              />
            );
          case 'hinge':
          case 'drawer-slide':
          case 'shelf-pin':
            return (
              <HardwareMesh
                key={comp.id}
                component={comp}
                pieceId={piece.id}
                isSelected={isCompSelected}
                isPieceSelected={isSelected}
              />
            );
          default:
            return null;
        }
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
