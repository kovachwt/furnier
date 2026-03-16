import { deflateSync, inflateSync, strToU8, strFromU8 } from 'fflate';
import type { Project, Material } from '../types';

// --- base64url encode/decode (no padding, URL-safe) ---

function uint8ToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToUint8(str: string): Uint8Array {
  // Restore standard base64
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  // Add padding
  while (b64.length % 4 !== 0) b64 += '=';
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- Default material IDs (to strip from share data) ---

const DEFAULT_MATERIAL_IDS = new Set([
  'melamine-white-16', 'melamine-white-18', 'melamine-white-25',
  'melamine-oak-16', 'melamine-oak-18', 'melamine-walnut-18',
  'melamine-grey-18', 'melamine-black-18',
  'melamine-white-16-2750', 'melamine-white-18-2750',
  'melamine-white-18-2440',
  'chipboard-raw-16', 'chipboard-raw-18', 'chipboard-raw-22',
  'mdf-6', 'mdf-12', 'mdf-18', 'mdf-22',
  'plywood-birch-6', 'plywood-birch-12', 'plywood-birch-15',
  'plywood-birch-18', 'plywood-birch-24',
  'hardboard-3',
]);

/**
 * Compress a Project into a URL-safe base64 string.
 * Only includes non-default materials to save space.
 */
export function compressProject(project: Project): string {
  // Only include custom (non-default) materials
  const customMaterials = project.materials.filter(
    (m) => !DEFAULT_MATERIAL_IDS.has(m.id)
  );

  const shareData = {
    v: 1, // version for future compatibility
    name: project.name,
    room: project.room,
    pieces: project.pieces,
    ...(customMaterials.length > 0 ? { materials: customMaterials } : {}),
  };

  const json = JSON.stringify(shareData);
  const compressed = deflateSync(strToU8(json), { level: 9 });
  return uint8ToBase64Url(compressed);
}

/**
 * Decompress a base64url string back into a Project.
 * Merges default materials back in.
 */
export function decompressProject(
  encoded: string,
  defaultMaterials: Material[]
): Project {
  const bytes = base64UrlToUint8(encoded);
  const json = strFromU8(inflateSync(bytes));
  const data = JSON.parse(json) as {
    v?: number;
    name: string;
    room: Project['room'];
    pieces: Project['pieces'];
    materials?: Material[];
  };

  // Merge: start with defaults, then add/override with custom materials
  const materialMap = new Map<string, Material>();
  for (const m of defaultMaterials) materialMap.set(m.id, m);
  if (data.materials) {
    for (const m of data.materials) materialMap.set(m.id, m);
  }

  return {
    name: data.name,
    room: data.room,
    pieces: data.pieces,
    materials: Array.from(materialMap.values()),
  };
}

/** Build a full share URL from a project. */
export function generateShareUrl(project: Project): string {
  const encoded = compressProject(project);
  const base = window.location.href.split('#')[0];
  return `${base}#share=${encoded}`;
}

/** Parse a share hash from the current URL. Returns the encoded string or null. */
export function getShareFromHash(): string | null {
  const hash = window.location.hash;
  if (!hash.startsWith('#share=')) return null;
  return hash.slice('#share='.length);
}

/** Clear the share hash from the URL without triggering navigation. */
export function clearShareHash(): void {
  if (window.location.hash.startsWith('#share=')) {
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }
}

/** Estimate share URL length without building the full URL. */
export function estimateShareUrlLength(project: Project): number {
  const encoded = compressProject(project);
  // base URL + #share= + encoded
  const base = window.location.href.split('#')[0];
  return base.length + '#share='.length + encoded.length;
}

/** Max safe URL length (conservative, works in all modern browsers) */
export const MAX_SAFE_URL_LENGTH = 64_000;
