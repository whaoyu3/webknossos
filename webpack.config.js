module.exports = function(env = {}) {
  /* eslint no-var:0, import/no-extraneous-dependencies:0, global-require:0, func-names:0 */
  var webpack = require("webpack");
  var fs = require("fs");
  var path = require("path");
  const UglifyJsPlugin = require("uglifyjs-webpack-plugin");
  const MiniCssExtractPlugin = require("mini-css-extract-plugin");

  var srcPath = path.resolve(__dirname, "app/assets/javascripts/");
  var nodePath = path.join(__dirname, "node_modules/");

  fs.writeFileSync(path.join(__dirname, "target", "webpack.pid"), process.pid, "utf8");

  const plugins = [
    new webpack.DefinePlugin({
      "process.env.NODE_ENV": env.production ? '"production"' : '"development"',
    }),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/),
    new MiniCssExtractPlugin({
      filename: "[name].css",
      chunkFilename: "[name].css",
    }),
  ];

  if (env.production) {
    plugins.push(
      new UglifyJsPlugin({
        cache: true,
        parallel: true,
        sourceMap: true,
        uglifyOptions: {
          // compress is bugged, see https://github.com/mishoo/UglifyJS2/issues/2842
          // even inline: 1 causes bugs, see https://github.com/scalableminds/webknossos/pull/2713
          compress: false,
        },
      }),
    );
  }

  return {
    entry: {
      main: "main.js",
    },
    mode: env.production ? "production" : "development",
    output: {
      path: `${__dirname}/public/bundle`,
      filename: "[name].js",
      sourceMapFilename: "[file].map",
      publicPath: "/assets/bundle/",
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          exclude: /(node_modules|bower_components)/,
          use: "babel-loader",
        },
        {
          test: /\.less$/,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            {
              loader: "less-loader",
              options: {
                javascriptEnabled: true,
              },
            },
          ],
        },
        {
          test: /\.css$/,
          use: [
            MiniCssExtractPlugin.loader,
            "css-loader",
            {
              loader: "less-loader",
              options: {
                javascriptEnabled: true,
              },
            },
          ],
        },
        {
          test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          use: {
            loader: "url-loader",
            options: {
              limit: 10000,
              mimetype: "application/font-woff",
            },
          },
        },
        {
          test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
          use: "file-loader",
        },
        { test: /\.png$/, use: { loader: "url-loader", options: { limit: 100000 } } },
        { test: /\.jpg$/, use: "file-loader" },
        { test: /\.proto$/, loaders: ["json-loader", "proto-loader6"] },
      ],
    },
    externals: {
      // fs, tls and net are needed so that airbrake-js can be compiled by webpack
      fs: "{}",
      tls: "{}",
      net: "{}",
    },
    resolve: {
      modules: [srcPath, nodePath],
    },
    optimization: {
      splitChunks: {
        chunks: "initial",
      },
    },
    // See https://webpack.js.org/configuration/devtool/
    devtool: env.production ? "source-map" : "eval-source-map",
    plugins,
  };
};
