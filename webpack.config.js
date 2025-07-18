import path from 'path';
import { fileURLToPath } from 'url';
import CopyWebpackPlugin from 'copy-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import { CleanWebpackPlugin } from 'clean-webpack-plugin';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  mode: 'production',
  entry: {
    background: './src/background/index.js',
    popup: './src/features/popup/popup.js',
    options: './src/features/options/Options.js',
    onboarding: './src/features/onboarding/Onboarding.js',
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true,
  },
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
    ],
  },
  plugins: [
    new CleanWebpackPlugin(),
    new HtmlWebpackPlugin({
      filename: 'popup.html',
      template: './src/features/popup/popup.html',
      chunks: ['popup'],
    }),
    new HtmlWebpackPlugin({
      filename: 'options.html',
      template: './src/features/options/Options.html',
      chunks: ['options'],
    }),
    new HtmlWebpackPlugin({
      filename: 'onboarding.html',
      template: './src/features/onboarding/Onboarding.html',
      chunks: ['onboarding'],
    }),
    new CopyWebpackPlugin({
      patterns: [
        { from: 'manifest.json', to: '.' },
        { from: 'src/assets/icons', to: 'assets/icons' },
        { from: 'navigator.js', to: '.' },
        { from: 'src/features/popup/popup.css', to: 'popup.css' },
        { from: 'src/features/options/Options.css', to: 'Options.css' },
        {
          from: 'src/features/onboarding/Onboarding.css',
          to: 'Onboarding.css',
        },
      ],
    }),
  ],
  resolve: {
    extensions: ['.js', '.json'],
  },
  optimization: {
    splitChunks: false,
  },
  target: 'web',
  devtool: 'source-map',
};
