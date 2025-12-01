module.exports = {
  devServer: (devServerConfig) => {
    // Remove deprecated middleware options
    delete devServerConfig.onBeforeSetupMiddleware;
    delete devServerConfig.onAfterSetupMiddleware;

    // Use the new setupMiddlewares option if needed
    devServerConfig.setupMiddlewares = (middlewares, devServer) => {
      // Add custom middlewares before if needed
      // middlewares.unshift(...);

      // Add custom middlewares after if needed
      // middlewares.push(...);

      return middlewares;
    };

    return devServerConfig;
  },
};
