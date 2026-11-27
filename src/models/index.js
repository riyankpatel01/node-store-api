// MySQL-backed data access. Tests swap this for in-memory models through createApp({ models }).
module.exports = {
  users: require('./user.model'),
  products: require('./product.model'),
};
