#!/usr/bin/env node

/**
 * The purpose of this script is to check to see if current version exists in CDN already
 * - If it does exist, this script will error out and cause the build to fail
 * - Otherwise lets build continues
 */

const fetch = require('node-fetch');
const fs = require('fs-extra');
const getEnvironmentCdn = require('./shared.js').getEnvironmentCdn;

try {
    prepSharedUi();
} catch (e) {
    console.error(e);
    process.exit(1);
}

async function prepSharedUi() {
    const canDeploy = await canDeployCurrentVersion();
    if (!canDeploy) {
        throw Error('It looks like the version already exists. Did you update your version?');
    }

    console.log('Completed confirming version can be deployed');
}

/**
 * Check for version on remote
 * - Kill if found
 * - otherwise continue
 *
 * Setup environment variable. If `.env` file exists
 * - check for `PUBLIC_URL=` and replace it with temp value
 * - Otherwise create it and set `PUBLIC_URL=`
 */
function canDeployCurrentVersion() {
    return new Promise(async resolve => {
        const userDir = process.cwd();
        const { version } = await fs.readJson(`${userDir}/package.json`);
        const cdn = await getEnvironmentCdn();

        const request = await fetch(`${cdn}/${version}/CHANGELOG.md`);
        const response = await request.text();

        resolve(response.trim() === 'Not found');
    });
}
