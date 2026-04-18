import { useStore } from '../../store/useStore';

export interface CameraPreset {
  id: string;
  label: string;
  icon: string;
  position: [number, number, number];
  target: [number, number, number];
}

const PRESETS: CameraPreset[] = [
  {
    id: 'front',
    label: 'Front',
    icon: '⊡',
    position: [0, 1.5, 6],
    target: [0, 1, 0],
  },
  {
    id: 'top',
    label: 'Top',
    icon: '⊞',
    position: [0, 8, 0.01],
    target: [0, 0, 0],
  },
  {
    id: 'side',
    label: 'Side',
    icon: '⊣',
    position: [6, 2, 0],
    target: [0, 1, 0],
  },
  {
    id: 'iso',
    label: 'Iso',
    icon: '◇',
    position: [4, 3, 4],
    target: [0, 1, 0],
  },
];

export function CameraPresets() {
  const activePreset = useStore((s) => s.activeCameraPreset);

  const animateTo = (preset: CameraPreset) => {
    const state = useStore.getState();
    state.setActiveCameraPreset(preset.id);
    state.setCameraTarget(preset.position, preset.target);
  };

  return (
    <div className="tool-group camera-presets-group">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          className={`tool-btn camera-preset-btn ${activePreset === preset.id ? 'active' : ''}`}
          onClick={() => animateTo(preset)}
          title={preset.label}
        >
          {preset.icon}
        </button>
      ))}
    </div>
  );
}
