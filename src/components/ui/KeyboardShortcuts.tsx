interface ShortcutGroup {
  title: string;
  shortcuts: { keys: string; desc: string }[];
}

const groups: ShortcutGroup[] = [
  {
    title: 'Navigation',
    shortcuts: [
      { keys: 'Tab', desc: 'Select next piece' },
      { keys: 'Shift + Tab', desc: 'Select previous piece' },
      { keys: 'Enter', desc: 'Drill into components / next component' },
      { keys: 'Shift + Enter', desc: 'Previous component' },
      { keys: 'Escape', desc: 'Back out (component → piece → deselect)' },
    ],
  },
  {
    title: 'Movement',
    shortcuts: [
      { keys: '← →', desc: 'Nudge X by grid size' },
      { keys: '↑ ↓', desc: 'Nudge Z by grid size' },
      { keys: 'Page Up / Down', desc: 'Nudge Y by grid size' },
      { keys: 'Shift + arrows', desc: 'Fine nudge (1 mm)' },
    ],
  },
  {
    title: 'Tools & Toggles',
    shortcuts: [
      { keys: 'S', desc: 'Select tool' },
      { keys: 'W', desc: 'Move tool' },
      { keys: 'G', desc: 'Toggle grid visibility' },
      { keys: 'N', desc: 'Toggle grid snap' },
      { keys: 'F', desc: 'Toggle face snap' },
      { keys: 'D', desc: 'Toggle dimensions' },
      { keys: 'X', desc: 'Toggle exploded view' },
    ],
  },
  {
    title: 'Actions',
    shortcuts: [
      { keys: 'Ctrl + Z', desc: 'Undo' },
      { keys: 'Ctrl + Y', desc: 'Redo' },
      { keys: 'Ctrl + D', desc: 'Duplicate selected piece' },
      { keys: 'Delete', desc: 'Delete selected' },
      { keys: '?', desc: 'Toggle this help' },
    ],
  },
];

export function KeyboardShortcuts({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="shortcuts-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>⌨ Keyboard Shortcuts</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>
        <div className="shortcuts-body">
          {groups.map((g) => (
            <div key={g.title} className="shortcut-group">
              <h3>{g.title}</h3>
              <div className="shortcut-list">
                {g.shortcuts.map((s) => (
                  <div key={s.keys} className="shortcut-row">
                    <kbd className="shortcut-keys">{s.keys}</kbd>
                    <span className="shortcut-desc">{s.desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
