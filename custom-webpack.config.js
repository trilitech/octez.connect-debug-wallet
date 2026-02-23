module.exports = {
  resolve: {
    fallback: {
      fs: false,
      vm: require.resolve("vm-browserify"),
      url: require.resolve("url/"),
    },
  },
};
