// Baseline: fresh app load with no pieces placed.
// Catches regressions in room rendering, camera defaults, lighting,
// grid, toolbar layout, sidebar default state.

module.exports = {
  name: 'empty-room',
  description: 'Fresh app load, no furniture placed',
  action: async (_page, _app) => {
    // openApp() in the runner already produces the empty-room state.
    // Nothing else to do.
  },
};
