/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { app, dialog, Menu } from 'electron';
import fs from 'fs';
import os from 'os';

import {
    getBundledAppInstalled,
    setBundledAppInstalled,
} from '../common/persistedStore';
import { ensureBundledAppExists } from './apps/appBundler';
import { installAllLocalAppArchives } from './apps/appChanges';
import {
    ensureBundledSourceExists,
    initialiseAllSources,
} from './apps/sources/sources';
import argv, { appArguments, getStartupApp } from './argv';
import {
    getAppsExternalDir,
    getAppsLocalDir,
    getAppsRootDir,
    getBundledResourcePath,
    getNodeModulesDir,
    getUnpackedBundledResourcePath,
    getUserDataPath,
} from './config';
import describeError from './describeError';
import loadDevtools from './devtools';
import { chmodDir } from './fileUtil';
import { logger } from './log';
import menu from './menu';
import { ensureDirExists } from './mkdir';
import {
    openDownloadableAppWindow,
    openLauncherWindow,
    openLocalAppWindow,
} from './windows';

const initAppsDirectory = async () => {
    ensureDirExists(getAppsRootDir());
    ensureDirExists(getAppsLocalDir());
    ensureDirExists(getAppsExternalDir());
    ensureDirExists(getNodeModulesDir());

    initialiseAllSources();

    if (!getBundledAppInstalled()) {
        ensureBundledSourceExists();
        await ensureBundledAppExists();
        setBundledAppInstalled();
    }

    await installAllLocalAppArchives();
};

export const openInitialWindow = (args = argv) => {
    const startupApp = getStartupApp(args);

    if (startupApp == null) {
        openLauncherWindow();
        return;
    }

    if (startupApp.local) {
        openLocalAppWindow(startupApp.name, appArguments(args));
    } else {
        openDownloadableAppWindow(startupApp, appArguments(args));
    }
};

const fatalError = (error: unknown) => {
    dialog.showMessageBoxSync({
        type: 'error',
        title: 'Initialization error',
        message: 'Error when starting application',
        detail: describeError(error),
        buttons: ['OK'],
    });

    app.quit();
};

const copyNrfutil = () => {
    const binName = `nrfutil${process.platform === 'win32' ? '.exe' : ''}`;

    const nrfutilBundled = getBundledResourcePath(binName);
    const nrfutilInAppPath = getUserDataPath(binName);

    fs.copyFileSync(nrfutilBundled, nrfutilInAppPath);
};

const copyNrfutilSandboxes = async () => {
    const nrfutilBundledSandboxes =
        getUnpackedBundledResourcePath('nrfutil-sandboxes');

    if (!fs.existsSync(nrfutilBundledSandboxes)) return;

    const nrfutilBundledSandboxesDest = getUserDataPath('nrfutil-sandboxes');

    fs.mkdirSync(nrfutilBundledSandboxesDest, { recursive: true });

    fs.cpSync(nrfutilBundledSandboxes, nrfutilBundledSandboxesDest, {
        recursive: true,
        force: false,
    });

    if (os.platform() !== 'win32') {
        await chmodDir(
            nrfutilBundledSandboxesDest,
            fs.constants.S_IRWXU | fs.constants.S_IRGRP | fs.constants.S_IROTH, // eslint-disable-line no-bitwise
        );
    }
};

const initNrfutil = async () => {
    copyNrfutil();
    await copyNrfutilSandboxes();
};

export default () => {
    app.on('ready', async () => {
        await loadDevtools();

        Menu.setApplicationMenu(menu());

        try {
            await initAppsDirectory();
            await initNrfutil();
            openInitialWindow();
        } catch (error) {
            fatalError(error);
        }
    });

    app.on('render-process-gone', (_event, wc, details) => {
        wc.getTitle();
        logger.error(`Renderer crashed ${wc.getTitle()}`, details);
    });

    app.on('child-process-gone', (_event, details) => {
        logger.error(`Child process crashed `, details);
    });

    app.on('window-all-closed', () => {
        app.quit();
    });
};
