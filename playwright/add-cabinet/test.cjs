// Adds a default open cabinet. Covers the cabinet template
// generator, panel meshes, shelf placement, and default material.

module.exports = {
  name: 'add-cabinet',
  description: 'Add a default open cabinet (600×720×400, 2 shelves)',
  action: async (page, app) => {
    await app.addPiece(page, { template: 'cabinet' });
  },
};
