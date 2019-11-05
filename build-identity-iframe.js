const HtmlWebpackPlugin = require('html-webpack-plugin')
const webpack = require('webpack')
const path = require('path')

let acceptedEnvironments = ['production', 'staging', 'development', 'sandbox']
let environment = process.env.NODE_ENV

if (!acceptedEnvironments.includes(environment)) {
  throw new Error(`Environment ${environment} not supported`)
}

const babelConfig = {
  'presets': [
    [
      '@babel/env', {
        'targets': {
          'ie': 11,
          'chrome': 27,
          'firefox': 30,
          'safari': 7,
          'opera': 23
        },
        'loose': true,
        'exclude': [
          'transform-regenerator'
        ]
      }
    ],
    '@babel/react',
    '@babel/flow'
  ],
  'plugins': [
    'transform-inline-environment-variables',
    'babel-plugin-transform-es2015-modules-commonjs',
    [ '@babel/plugin-syntax-dynamic-import', { 'loose': true } ],
    [ '@babel/plugin-proposal-decorators', { 'loose': true, 'legacy': true } ],
    [ '@babel/plugin-proposal-class-properties', { 'loose': true } ],
    [ '@babel/plugin-transform-for-of', { 'assumeArray': true } ],
    [ '@babel/plugin-transform-runtime', { 'corejs': false, 'helpers': true, 'regenerator': false } ]
  ]
}

const webpackConfig = {
  mode: 'production',
  entry: path.resolve(__dirname, 'iframes/identity/identity.js'),
  output: {
    path: path.resolve(__dirname, 'dist/identity'),
    filename: 'identity.js'
  },
  plugins: [new HtmlWebpackPlugin({
    title: 'Identity',
    filename: 'identity.html',
    showErrors: false
  })],
  module: {
    rules: [{
      test: /\.js$/,
      loader: 'babel-loader',
      options: babelConfig
    }]
  }
}

const compiler = webpack(webpackConfig);

compiler.run((err, stats) => {
  if (err) {
    console.error(err)
  }
})


