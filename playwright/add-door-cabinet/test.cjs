// Cabinet with doors — covers door panel meshes on the front face.

module.exports = {
  name: 'add-door-cabinet',
  description: 'Add a cabinet with 2 doors (800×900×400, 2 shelves)',
  action: async (page, app) => {
    await app.addPiece(page, {
      template: 'door-cabinet',
      width: 800,
      height: 900,
      depth: 400,
      shelves: 2,
      doors: 2,
    });
  },
};
