import { useCallback, useState, useMemo } from 'react';
import * as THREE from 'three';
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
    } else if (e.shiftKey) {
      useStore.getState().togglePieceInSelection(pieceId);
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
        {isPieceSelected && <HingeSwingArc hinge={component} />}
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

/**
 * Translucent quarter-circle sector visualising the door's swing path.
 *
 * Lives in the hinge's local frame: the closed door points along +Z
 * (cabinet front), and the door swings open toward +X (right) or −X
 * (left). The arc lies in the local XZ plane (horizontal sweep),
 * radius = doorWidth, spanning 90°.
 *
 * Rendered only when the owning piece is selected so an unselected
 * scene stays uncluttered.
 */
function HingeSwingArc({ hinge }: { hinge: Hinge }) {
  const geometry = useMemo(() => {
    const doorWidth = hinge.doorWidth ?? 400;
    const swingDirection = hinge.swingDirection ?? 'right';
    const r = mmToWorld(Math.max(50, doorWidth));
    const segs = 24;
    const dir = swingDirection === 'left' ? -1 : 1;
    const start = 0;                         // closed: +Z
    const end = dir * Math.PI / 2;           // open: ±X

    // Triangle fan: center + arc points. Positions in XZ plane (y=0):
    // point(θ) = (sin θ * r, 0, cos θ * r)
    const positions: number[] = [0, 0, 0];
    for (let i = 0; i <= segs; i++) {
      const t = start + (end - start) * (i / segs);
      positions.push(Math.sin(t) * r, 0, Math.cos(t) * r);
    }
    const indices: number[] = [];
    for (let i = 0; i < segs; i++) {
      indices.push(0, i + 1, i + 2);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }, [hinge.doorWidth, hinge.swingDirection]);

  // Outline of the sector: two radii + the arc curve.
  const edgeGeometry = useMemo(() => {
    const doorWidth = hinge.doorWidth ?? 400;
    const swingDirection = hinge.swingDirection ?? 'right';
    const r = mmToWorld(Math.max(50, doorWidth));
    const segs = 24;
    const dir = swingDirection === 'left' ? -1 : 1;
    const end = dir * Math.PI / 2;
    const pts: THREE.Vector3[] = [new THREE.Vector3(0, 0, 0)];
    for (let i = 0; i <= segs; i++) {
      const t = end * (i / segs);
      pts.push(new THREE.Vector3(Math.sin(t) * r, 0, Math.cos(t) * r));
    }
    pts.push(new THREE.Vector3(0, 0, 0));
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    return geo;
  }, [hinge.doorWidth, hinge.swingDirection]);

  return (
    <group>
      <mesh geometry={geometry} renderOrder={2}>
        <meshBasicMaterial
          color="#ff922b"
          transparent
          opacity={0.22}
          side={THREE.DoubleSide}
          depthTest={false}
        />
      </mesh>
      <lineSegments geometry={edgeGeometry} renderOrder={3}>
        <lineBasicMaterial color="#ff922b" transparent opacity={0.8} depthTest={false} />
      </lineSegments>
    </group>
  );
}
