// Bookshelf template — taller piece, more shelves, no doors.

module.exports = {
  name: 'add-bookshelf',
  description: 'Add a bookshelf (800×1800×300, 4 shelves)',
  action: async (page, app) => {
    await app.addPiece(page, {
      template: 'bookshelf',
      width: 800,
      height: 1800,
      depth: 300,
      shelves: 4,
    });
  },
};
