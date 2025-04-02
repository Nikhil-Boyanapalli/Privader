const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  entry: {
    popup: './popup.js',
    content: './content.js',
    background: './background.js',
    'policy-analyzer': './policy-analyzer.js',
    'manage-sites': './manage-sites.js',
    vendor: ['zxcvbn']
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
    clean: true
  },
  optimization: {
    minimize: true,
    splitChunks: {
      chunks: 'all',
      minSize: 0
    }
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json' },
        { from: 'popup.html' },
        { from: 'popup.css' },
        { from: 'content.css' },
        { from: 'manage-sites.html' },
        { from: 'icons', to: 'icons' }
      ]
    })
  ]
}; 