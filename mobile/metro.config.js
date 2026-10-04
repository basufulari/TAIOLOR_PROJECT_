const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Lower parallelism avoids OOM on Windows when bundling large apps
config.maxWorkers = 2;

module.exports = config;
