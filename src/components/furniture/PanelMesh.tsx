import { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { Panel } from '../../types';
import { useStore } from '../../store/useStore';
import { mmToWorld } from '../room/RoomBox';

interface PanelMeshProps {
  panel: Panel;
  pieceId: string;
  isSelected: boolean;
  isPieceSelected: boolean;
  isFixture?: boolean;
  fixtureColor?: string;
}

export function PanelMesh({ panel, pieceId, isSelected, isPieceSelected, isFixture, fixtureColor }: PanelMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const setSelection = useStore((s) => s.setSelection);
  const materials = useStore((s) => s.project.materials);
  const [hovered, setHovered] = useState(false);

  const mat = materials.find((m) => m.id === panel.materialId);
  const baseColor = isFixture ? (fixtureColor ?? '#808080') : (mat?.color ?? '#ccbbaa');
  const color = baseColor;

  const w = mmToWorld(panel.width);
  const h = mmToWorld(panel.height);
  const d = mmToWorld(panel.depth);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.detail === 2) {
      // Double click selects component
      setSelection(pieceId, panel.id);
    } else {
      setSelection(pieceId);
    }
  }, [pieceId, panel.id, setSelection]);

  return (
    <mesh
      ref={meshRef}
      position={[
        mmToWorld(panel.position[0]),
        mmToWorld(panel.position[1]),
        mmToWorld(panel.position[2]),
      ]}
      rotation={panel.rotation as unknown as THREE.Euler}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[w, h, d]} />
      <meshStandardMaterial
        color={isSelected ? '#5b9ef5' : isPieceSelected ? '#8bbcf5' : hovered ? '#d4c4b0' : color}
        transparent={isFixture || (!isSelected && !isPieceSelected)}
        opacity={isFixture ? (isSelected || isPieceSelected ? 0.65 : 0.4) : (isSelected || isPieceSelected ? 1 : 0.95)}
      />
      <Edges
        threshold={15}
        color={isSelected ? '#2563eb' : isPieceSelected ? '#60a5fa' : isFixture ? '#ff8800' : '#666'}
        lineWidth={isSelected ? 2 : isFixture ? 1.5 : 1}
      />
    </mesh>
  );
}
