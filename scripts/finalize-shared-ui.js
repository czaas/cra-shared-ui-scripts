#!/usr/bin/env node

/**
 * The purpose of this script is to move all items in the `build` folder into a nested hashed folder based on the latest git commit
 *
 * The reason we do this is for versioning our bundles when deployed to a CDN. Each deploy will create a new folder within your deployed path on the CDN
 *
 * For example if your path is deployed to `https://some-cdn.com/ui/my-app/`
 *
 * This script will create a directory like:
 * `https://some-cdn.com/ui/my-app/1.0.0/{all files in the "build" directory}`
 *
 * You consume the app.js file which will load all the entry points found in the outputed react application manifest
 */
const fs = require('fs-extra');
const getEnvironmentCdn = require('./shared.js').getEnvironmentCdn;

try {
    finalizeSharedUi();
} catch (e) {
    console.error(e);
    exit(1);
}

async function finalizeSharedUi() {
    const userDir = process.cwd();
    const { version } = await fs.readJSON(`${userDir}/package.json`);

    // Get the users directory where this script was executed
    const initialCommitDir = `${userDir}/${version}`;

    // Build dir based on create-react-app
    const buildDir = `${userDir}/build`;
    const assetManifest = await fs.readJSON(`${buildDir}/asset-manifest.json`);
    const entryPoints = assetManifest.entrypoints.map(entry => entry);
    const cdn = await getEnvironmentCdn();

    // app.js file to be referenced by the consuming application
    const appJs = `[${entryPoints.map(entry => `'${entry}'`).join(',')}].forEach(function(entry) {
    var script = document.createElement('script');
    script.src = '${cdn}/${version}/' + entry;
    document.getElementsByTagName('head')[0].appendChild(script);
});`;

    // name file and location
    const appJsPath = `${userDir}/build/app.js`;

    // ensure and write app.js
    await fs.ensureFile(appJsPath);
    await fs.writeFile(appJsPath, appJs);

    // copy over changelog
    await fs.copyFile(`${userDir}/CHANGELOG.md`, `${buildDir}/CHANGELOG.md`);

    // Finally move all existing files in build directory into versioned folder
    await fs.move(buildDir, initialCommitDir);
    await fs.move(initialCommitDir, `${userDir}/build/${version}`);

    // Update latest JSON in build directory (not nested)
    const latestJsonPath = `${userDir}/build/latest.json`;
    await fs.ensureFile(latestJsonPath);
    await fs.writeJSON(latestJsonPath, {
        version,
    });
}
