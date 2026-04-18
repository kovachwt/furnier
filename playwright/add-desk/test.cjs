// Desk template — exercises the leg-style rendering path.

module.exports = {
  name: 'add-desk',
  description: 'Add a desk (1200×750×600, round legs)',
  action: async (page, app) => {
    await app.addPiece(page, {
      template: 'desk',
      width: 1200,
      depth: 600,
    });
  },
};
