const { execSync } = require('child_process');
const path = require('path');

exports.default = async function(context) {
  if (context.electronPlatformName === 'darwin') {
    const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
    console.log(`[afterPack] Ad-hoc codesigning macOS app bundle at: ${appPath}`);
    try {
      execSync(`codesign --force --deep --sign - "${appPath}"`, { stdio: 'inherit' });
      execSync(`codesign --verify --deep --strict "${appPath}"`, { stdio: 'inherit' });
      console.log(`[afterPack] ✅ Successfully ad-hoc signed and verified: ${appPath}`);
    } catch (err) {
      console.error(`[afterPack] ⚠️ Codesign error:`, err);
      throw err;
    }
  }
};
