import { useCallback, useState } from 'react';
import type { ThreeEvent } from '@react-three/fiber';
import type { Hinge, DrawerSlide, ShelfPin, Handle } from '../../types';
import { useStore } from '../../store/useStore';
import { mmToWorld } from '../room/RoomBox';

interface Props {
  component: Hinge | DrawerSlide | ShelfPin | Handle;
  pieceId: string;
  isSelected: boolean;
  isPieceSelected: boolean;
}

export function HardwareMesh({ component, pieceId, isSelected, isPieceSelected }: Props) {
  const setSelection = useStore((s) => s.setSelection);
  const [hovered, setHovered] = useState(false);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.detail === 2) {
      setSelection(pieceId, component.id);
    } else {
      setSelection(pieceId);
    }
  }, [pieceId, component.id, setSelection]);

  const baseColor = isSelected ? '#5b9ef5' : isPieceSelected ? '#8bbcf5' : hovered ? '#999' : '#777';

  const pos: [number, number, number] = [
    mmToWorld(component.position[0]),
    mmToWorld(component.position[1]),
    mmToWorld(component.position[2]),
  ];

  if (component.type === 'hinge') {
    return (
      <group position={pos} rotation={component.rotation as any}>
        <mesh onClick={handleClick}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[mmToWorld(35), mmToWorld(12), mmToWorld(35)]} />
          <meshStandardMaterial color={baseColor} metalness={0.8} roughness={0.3} />
        </mesh>
      </group>
    );
  }

  if (component.type === 'drawer-slide') {
    const len = mmToWorld(component.length);
    return (
      <group position={pos} rotation={component.rotation as any}>
        <mesh onClick={handleClick}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[mmToWorld(12), mmToWorld(40), len]} />
          <meshStandardMaterial color={baseColor} metalness={0.7} roughness={0.4} />
        </mesh>
      </group>
    );
  }

  // shelf-pin
  if (component.type === 'shelf-pin') {
    return (
      <group position={pos}>
        <mesh onClick={handleClick}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
          onPointerOut={() => setHovered(false)}
        >
          <cylinderGeometry args={[mmToWorld(3), mmToWorld(3), mmToWorld(12), 8]} />
          <meshStandardMaterial color={baseColor} metalness={0.9} roughness={0.2} />
        </mesh>
      </group>
    );
  }

  // handle — knob or pull
  if (component.type === 'handle') {
    const h = component as Handle;
    if (h.handleType === 'knob') {
      // Sphere for knob
      const r = mmToWorld(h.diameter);
      return (
        <group position={pos} rotation={component.rotation as any}>
          <mesh onClick={handleClick}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
            onPointerOut={() => setHovered(false)}
          >
            <sphereGeometry args={[r, 12, 8]} />
            <meshStandardMaterial color={baseColor} metalness={0.85} roughness={0.25} />
          </mesh>
        </group>
      );
    }
    // pull — elongated box
    const w = mmToWorld(h.diameter);
    const hh = mmToWorld(h.height);
    const d = mmToWorld(8);
    return (
      <group position={pos} rotation={component.rotation as any}>
        <mesh onClick={handleClick}
          onPointerOver={(e) => { e.stopPropagation(); setHovered(true); }}
          onPointerOut={() => setHovered(false)}
        >
          <boxGeometry args={[w, hh, d]} />
          <meshStandardMaterial color={baseColor} metalness={0.85} roughness={0.25} />
        </mesh>
      </group>
    );
  }

  return null;
}
