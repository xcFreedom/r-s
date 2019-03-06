const express = require('express');
const opn = require('opn');
const path = require('path');
const webpack = require('webpack');
const webpackDevMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const ConnectHistoryApiFallback = require('connect-history-api-fallback');

const app = express();
const config = require('./webpack.dev.config.js');
const compiler = webpack(config);

app.use('/', ConnectHistoryApiFallback());

app.use(webpackDevMiddleware(compiler, {
  publicPath: config.output.publicPath,
  stats: { colors: true, warnings: false },
  lazy: false
}));

app.use(webpackHotMiddleware(compiler, {
  log: (msg) => {
    console.log(msg);
  }
}));

app.use(express.static(path.join(__dirname, '../dist')));

app.listen(10110, function() {
  // opn('http://localhost:10110');
});