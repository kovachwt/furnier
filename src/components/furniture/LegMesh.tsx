import { useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { Leg } from '../../types';
import { useStore } from '../../store/useStore';
import { mmToWorld } from '../room/RoomBox';

interface LegMeshProps {
  leg: Leg;
  pieceId: string;
  isSelected: boolean;
  isPieceSelected: boolean;
  isFixture?: boolean;
  fixtureColor?: string;
}

export function LegMesh({ leg, pieceId, isSelected, isPieceSelected, isFixture, fixtureColor }: LegMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const setSelection = useStore((s) => s.setSelection);
  const [hovered, setHovered] = useState(false);

  const baseColor = isFixture ? (fixtureColor ?? '#808080') : '#8b6914';

  const r = mmToWorld(leg.diameter / 2);
  const h = mmToWorld(leg.height);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.detail === 2) {
      setSelection(pieceId, leg.id);
    } else {
      setSelection(pieceId);
    }
  }, [pieceId, leg.id, setSelection]);

  return (
    <mesh
      ref={meshRef}
      position={[
        mmToWorld(leg.position[0]),
        mmToWorld(leg.position[1]),
        mmToWorld(leg.position[2]),
      ]}
      rotation={leg.rotation as unknown as THREE.Euler}
      onClick={handleClick}
      onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
      onPointerOut={() => setHovered(false)}
      castShadow
    >
      {leg.style === 'square' ? (
        <boxGeometry args={[mmToWorld(leg.diameter), h, mmToWorld(leg.diameter)]} />
      ) : leg.style === 'tapered' ? (
        <cylinderGeometry args={[r * 0.6, r, h, 12]} />
      ) : (
        <cylinderGeometry args={[r, r, h, 16]} />
      )}
      <meshStandardMaterial
        color={isSelected ? '#5b9ef5' : isPieceSelected ? '#8bbcf5' : hovered ? (isFixture ? '#d4c4b0' : '#b89970') : baseColor}
        transparent={!!isFixture}
        opacity={isFixture ? (isSelected || isPieceSelected ? 0.65 : 0.4) : 1}
      />
      {isFixture && (
        <Edges
          threshold={15}
          color={isSelected ? '#2563eb' : isPieceSelected ? '#60a5fa' : '#ff8800'}
          lineWidth={isSelected ? 2 : 1.5}
        />
      )}
    </mesh>
  );
}
