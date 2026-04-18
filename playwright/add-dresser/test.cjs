// Dresser template — multi-row drawer front rendering.

module.exports = {
  name: 'add-dresser',
  description: 'Add a dresser (900×1000×500, 4 drawer rows)',
  action: async (page, app) => {
    await app.addPiece(page, {
      template: 'dresser',
      width: 900,
      height: 1000,
      depth: 500,
      drawerRows: 4,
    });
  },
};
