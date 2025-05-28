const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const TerserPlugin = require("terser-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    mode: isProduction ? "production" : "development",
    entry: {
      bundle: path.resolve(__dirname, "src/index.js"),
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name][contenthash].js",
      clean: true,
      assetModuleFilename: "[name][ext]",
    },
    devtool: isProduction ? false : "source-map",
    devServer: isProduction
      ? undefined
      : {
          static: {
            directory: path.resolve(__dirname, "dist"),
            watch: {
              // Reduce file watching sensitivity to prevent unnecessary reloads
              ignored: /node_modules/,
              poll: 1000, // Check for changes every 1 second instead of constantly
            },
          },
          port: 5000,
          open: true,
          hot: true,
          compress: true,
          historyApiFallback: true,
          // More specific and less aggressive file watching
          watchFiles: {
            paths: ["src/**/*.js", "src/**/*.scss", "src/**/*.html"],
            options: {
              usePolling: false,
              interval: 1000, // Check every 1 second
              ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
            },
          },
          // Reduce live reload sensitivity
          liveReload: false, // Disable live reload, use only HMR
          // Add client configuration to reduce reconnection attempts
          client: {
            reconnect: 3, // Limit reconnection attempts
            overlay: {
              errors: true,
              warnings: false, // Don't show warnings in overlay
            },
          },
          // Optimize dev server performance
          devMiddleware: {
            writeToDisk: false,
            stats: "minimal", // Reduce console output
          },
        },
    // Add caching for better performance and stability
    cache: isProduction
      ? false
      : {
          type: "filesystem",
          buildDependencies: {
            config: [__filename],
          },
        },
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "sass-loader"],
        },
        {
          test: /\.js$/,
          exclude: /node_modules/,
          use: {
            loader: "babel-loader",
            options: {
              presets: ["@babel/preset-env"],
              cacheDirectory: true, // Enable babel caching
            },
          },
        },
        {
          test: /\.(png|svg|jpg|jpeg|gif|bmp|pdf)$/i,
          type: "asset/resource",
        },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({
        title: "COAB",
        filename: "index.html",
        template: "src/indexTemplate.html",
        cache: true, // Enable template caching
      }),
      new MiniCssExtractPlugin(),
    ],
    optimization: {
      minimizer: [new TerserPlugin(), new CssMinimizerPlugin()],
    },
  };
};
