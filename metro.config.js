// 섬 게임(assets/game/island.html)을 앱 에셋으로 넣기 위해 html 확장자를 추가한다.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('html');
// game/ 은 Vite 로 따로 빌드하는 폴더라 Metro 가 보지 않게 한다.
config.resolver.blockList = [/[\/]game[\/](src|dist|node_modules)[\/].*/];

module.exports = config;
