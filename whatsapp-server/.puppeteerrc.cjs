const { join } = require("path");

/**
 * Puppeteer config — tells puppeteer where to cache Chrome.
 * On Render the project root is /opt/render/project/src/whatsapp-server
 * so we store Chrome inside the project so it survives the build.
 */
module.exports = {
  cacheDirectory: join(__dirname, ".cache", "puppeteer"),
};
