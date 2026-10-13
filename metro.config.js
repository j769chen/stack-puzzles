const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const threeModule = path.join(__dirname, 'node_modules/three/build/three.module.js');

config.resolver.resolveRequest = (context, moduleName, platform) =>
  moduleName === 'three'
    ? { type: 'sourceFile', filePath: threeModule }
    : context.resolveRequest(context, moduleName, platform);

module.exports = config;
