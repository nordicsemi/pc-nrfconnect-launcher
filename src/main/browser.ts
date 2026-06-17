/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { enable } from '@electron/remote/main';
import {
    BrowserWindow,
    type BrowserWindowConstructorOptions,
    shell,
} from 'electron';

import { appArguments } from './argv';
import { getBundledResourcePath } from './config';

type BrowserWindowOptions = BrowserWindowConstructorOptions & {
    splashScreen?: boolean;
    url: string;
};

const createSplashScreen = (icon: BrowserWindowOptions['icon']) => {
    let splashScreen: BrowserWindow | null = new BrowserWindow({
        width: 400,
        height: 223,
        frame: false,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        show: false,
        transparent: true,
        icon,
    });
    splashScreen.loadURL(
        `file://${getBundledResourcePath()}/splashscreen.html`,
    );
    splashScreen.on('closed', () => {
        splashScreen = null;
    });
    splashScreen.show();
    enable(splashScreen.webContents);

    return splashScreen;
};

export const createWindow = (
    options: BrowserWindowOptions,
    args = appArguments(),
) => {
    const mergedOptions: BrowserWindowOptions = {
        show: true,
        autoHideMenuBar: true,
        ...options,
        webPreferences: {
            nodeIntegration: true,
            sandbox: false,
            contextIsolation: false,
            additionalArguments: args.length === 0 ? [] : ['--', ...args],
            backgroundThrottling: false,
            ...options.webPreferences,
        },
    };
    const browserWindow = new BrowserWindow(mergedOptions);

    let splashScreen: BrowserWindow | null;
    if (options.splashScreen) {
        splashScreen = createSplashScreen(options.icon);
    }

    browserWindow.loadURL(options.url);

    // Never navigate away from the given url, e.g. when the
    // user drags and drops a file into the browser window.
    browserWindow.webContents.on('will-navigate', event => {
        event.preventDefault();
    });

    // Open target=_blank link in default browser instead of a
    // new electron window.
    browserWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    browserWindow.once('ready-to-show', () => {
        if (mergedOptions.show !== false) {
            browserWindow.show();
        }
        // browserWindow.show();
        if (splashScreen && !splashScreen.isDestroyed()) {
            splashScreen.close();
        }
    });

    // @electron/remote is only usable (and only safe to expose) in
    // unsandboxed windows with node integration, i.e. legacy app windows.
    if (!mergedOptions.webPreferences?.sandbox) {
        enable(browserWindow.webContents);
    }

    return browserWindow;
};
