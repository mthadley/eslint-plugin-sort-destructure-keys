const { name, version } = require("../package.json");

/** @type {import("eslint").ESLint.Plugin} */
module.exports = {
  meta: {
    name,
    namespace: "sort-destructure-keys",
    version,
  },
  rules: {
    "sort-destructure-keys": require("./rules/sort-destructure-keys"),
  },
};
