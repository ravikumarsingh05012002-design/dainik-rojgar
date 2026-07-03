// Shim for React Native web bundling: react-native private interface expects
// a generic Utilities/Platform module that is absent in this install.
module.exports = require('react-native-web/dist/exports/Platform');
