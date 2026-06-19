import { useRef, useState, useCallback, useMemo } from 'react';
import * as THREE from 'three';
import type { ThreeEvent } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import type { Panel, Cutout } from '../../types';
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

/**
 * Build the panel's extruded geometry with cutouts punched through.
 *
 * The panel's local face is the width × height plane. In world space the
 * panel is rendered as a box of size [width, height, depth] centred on the
 * origin (matching the historical `boxGeometry([w, h, d])`), so we build a
 * 2D `THREE.Shape` in the XY plane spanning ±w/2, ±h/2, subtract each
 * cutout as a hole, extrude along +Z by `depth`, then shift the geometry
 * so its centre sits at the origin and it spans −depth/2 … +depth/2 in Z.
 *
 * Coordinates of cutouts are panel-local mm from the panel centre, exactly
 * as stored on `Cutout` — no extra mapping needed.
 */
function buildPunchedGeometry(width: number, height: number, depth: number, cutouts: Cutout[]): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.lineTo(width / 2, height / 2);
  shape.lineTo(-width / 2, height / 2);
  shape.closePath();

  for (const c of cutouts) {
    if (c.shape === 'rect') {
      const hole = new THREE.Path();
      const hw = c.w / 2;
      const hh = c.h / 2;
      hole.moveTo(c.x - hw, c.y - hh);
      hole.lineTo(c.x + hw, c.y - hh);
      hole.lineTo(c.x + hw, c.y + hh);
      hole.lineTo(c.x - hw, c.y + hh);
      hole.closePath();
      shape.holes.push(hole);
    } else {
      // circle — approximate with a closed path of arc segments
      const r = c.w / 2;
      const segs = 32;
      const hole = new THREE.Path();
      for (let i = 0; i <= segs; i++) {
        const a = (i / segs) * Math.PI * 2;
        const px = c.x + Math.cos(a) * r;
        const py = c.y + Math.sin(a) * r;
        if (i === 0) hole.moveTo(px, py);
        else hole.lineTo(px, py);
      }
      hole.closePath();
      shape.holes.push(hole);
    }
  }

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
    steps: 1,
  });
  // ExtrudeGeometry extrudes along +Z starting at z=0. Shift so the
  // slab is centred on the origin in Z (matches boxGeometry semantics).
  geo.translate(0, 0, -depth / 2);
  return geo;
}

export function PanelMesh({ panel, pieceId, isSelected, isPieceSelected, isFixture, fixtureColor }: PanelMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const setSelection = useStore((s) => s.setSelection);
  const materials = useStore((s) => s.project.materials);
  const [hovered, setHovered] = useState(false);

  const mat = materials.find((m) => m.id === panel.materialId);
  const baseColor = isFixture ? (fixtureColor ?? '#808080') : (mat?.color ?? '#ccbbaa');
  const color = baseColor;

  const showThickness = useStore((s) => s.showThickness);
  const w = mmToWorld(panel.width);
  const h = mmToWorld(panel.height);
  // Exaggerate panel thickness 10× for visibility (panels are only 16-25 mm)
  const d = mmToWorld(showThickness ? Math.max(panel.depth * 10, 5) : panel.depth);

  const hasCutouts = !isFixture && Array.isArray(panel.cutouts) && panel.cutouts.length > 0;

  // When cutouts are present, build a punched extruded geometry. We cache
  // it on the panel id + dims + cutouts so it isn't rebuilt every frame.
  // Scale world units: shape is built in mm then we scale the geometry
  // down by the world factor, which keeps the hole coordinates exact.
  const geometry = useMemo(() => {
    if (!hasCutouts) return null;
    const geo = buildPunchedGeometry(panel.width, panel.height, panel.depth, panel.cutouts!);
    // Scale mm → world units uniformly.
    const s = 0.001;
    geo.scale(s, s, s);
    if (showThickness) {
      // Exaggerate thickness 10× (Z axis only — keep the face plane true),
      // matching the non-cutout branch's Math.max(depth*10, 5) display depth.
      const displayedDepth = Math.max(panel.depth * 10, 5);
      geo.scale(1, 1, displayedDepth / panel.depth);
    }
    return geo;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    hasCutouts,
    panel.width,
    panel.height,
    panel.depth,
    showThickness,
    JSON.stringify(panel.cutouts),
  ]);

  const handleClick = useCallback((e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.detail === 2) {
      // Double click selects component
      setSelection(pieceId, panel.id);
    } else if (e.shiftKey) {
      // Shift+click toggles piece in multi-selection
      useStore.getState().togglePieceInSelection(pieceId);
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
      {geometry
        ? <primitive object={geometry} attach="geometry" />
        : <boxGeometry args={[w, h, d]} />}
      <meshStandardMaterial
        color={isSelected ? '#5b9ef5' : isPieceSelected ? '#8bbcf5' : hovered ? '#d4c4b0' : color}
        transparent={isFixture || (!isSelected && !isPieceSelected)}
        opacity={isFixture ? (isSelected || isPieceSelected ? 0.65 : 0.4) : (isSelected || isPieceSelected ? 1 : 0.95)}
        {...(hasCutouts ? { side: THREE.DoubleSide } : {})}
      />
      <Edges
        threshold={15}
        color={isSelected ? '#2563eb' : isPieceSelected ? '#60a5fa' : isFixture ? '#ff8800' : '#666'}
        lineWidth={isSelected ? 2 : isFixture ? 1.5 : 1}
      />
    </mesh>
  );
}
