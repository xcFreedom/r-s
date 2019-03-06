const path = require('path');
const webpack = require('webpack');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: {
    bundle: [
      path.join(__dirname, '../src/index')
    ],
    vendor: [
      'react',
      'react-dom',
      'react-router-dom',
      // 'mobx',
      // 'mobx-react'
    ]
  },
  output: {
    path: path.join(__dirname, '../dist'),
    publicPath: '/',
    filename: '[name].[hash:8].js',
    chunkFilename: '[name].[chunkhash:8].js'
  },
  module: {
    rules: [
      {
        test: /\.js[x]?$/,
        exclude: /node_modules/,
        loader: 'babel-loader'
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
        loader: 'url-loader?limit=8096&name=[name].[hash:8].[ext]'
      }
    ],
  },
  resolve: {
    extensions: ['.js'],
    alias: {
      '~': path.join(__dirname, '../src')
    }
  },
  plugins: [
    new CleanWebpackPlugin(path.join(__dirname, '../dist')),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, '../src/index.html'),
      js: ['vendor.js', 'bundle.js'],
      filename: 'index.html',
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeAttributeQuotes: true
      }
    }),
    new webpack.IgnorePlugin(/^\.\/locale$/, /moment$/)
  ]
}