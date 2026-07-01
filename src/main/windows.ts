/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    type OpenAppOptions,
    registerLauncherWindowFromMain,
    removeLauncherWindowFromMain,
} from '@nordicsemiconductor/pc-nrfconnect-shared/main';
import {
    app as electronApp,
    BrowserWindow,
    screen,
    type WebContents,
} from 'electron';
import { join } from 'path';

import packageJson from '../../package.json';
import {
    getLastWindowState,
    setLastWindowState,
    windowSizeLauncherKey,
    type WindowState,
} from '../common/persistedStore';
import { LOCAL, type SourceName } from '../common/sources';
import {
    type AppSpec,
    hasFixedSize,
    isInstalled,
    isQuickStartApp,
    type LaunchableApp,
} from '../ipc/apps';
import { getDownloadableApps, getLocalApps } from './apps/apps';
import argv, { appArguments, mergeAppArguments } from './argv';
import { createWindow } from './browser';
import bundledJlinkVersion from './bundledJlink';
import { getBundledResourcePath } from './config';
import { getAppIcon, getNrfConnectForDesktopIcon } from './icons';
import { logger } from './log';

let launcherWindow: BrowserWindow | undefined;
const appWindows: {
    browserWindow: BrowserWindow;
    app: LaunchableApp;
}[] = [];

export const openLauncherWindow = () => {
    if (launcherWindow) {
        if (launcherWindow.isMinimized()) {
            launcherWindow.restore();
        }
        launcherWindow.show();
        launcherWindow.focus();
        return Promise.resolve(launcherWindow);
    }

    launcherWindow = createLauncherWindow();
    return new Promise<BrowserWindow>(resolve => {
        launcherWindow?.webContents.once('did-finish-load', () =>
            resolve(launcherWindow as BrowserWindow),
        );
    });
};

const keepPositionWithinBounds = ({ x, y, height, width }: WindowState) => {
    if (x && y) {
        const { bounds } = screen.getDisplayMatching({
            x,
            y,
            width,
            height,
        });
        const left = Math.max(x, bounds.x);
        const top = Math.max(y, bounds.y);
        const right = Math.min(x + width, bounds.x + bounds.width);
        const bottom = Math.min(y + height, bounds.y + bounds.height);
        if (left > right || top > bottom) {
            // the window would be off screen
            return {};
        }
    }

    return { x, y };
};

const maximizeWindow = (window: BrowserWindow) => {
    window.webContents.on('did-finish-load', () => {
        window.maximize();
    });
};

const storeWindowPositionOnClose = (window: BrowserWindow, appName: string) => {
    window.on('close', () => {
        const bounds = window.getBounds();
        setLastWindowState(appName, {
            x: bounds.x,
            y: bounds.y,
            width: bounds.width,
            height: bounds.height,
            maximized: window.isMaximized(),
        });
    });
};

const createLauncherWindow = () => {
    const lastWindowState = getLastWindowState(windowSizeLauncherKey);

    const { x, y } = keepPositionWithinBounds(lastWindowState);
    const { width, height } = lastWindowState;
    const window = createWindow({
        title: `nRF Connect for Desktop v${packageJson.version}`,
        url: `file://${getBundledResourcePath()}/launcher.html`,
        icon: getNrfConnectForDesktopIcon(),
        x,
        y,
        width,
        height,
        minHeight: 500,
        minWidth: 600,
        center: true,
        splashScreen: !argv['skip-splash-screen'],
    });

    registerLauncherWindowFromMain(window);

    if (lastWindowState.maximized) maximizeWindow(window);

    storeWindowPositionOnClose(window, windowSizeLauncherKey);

    window.on('close', event => {
        if (appWindows.length > 0) {
            event.preventDefault();
            window.hide();
        } else {
            removeLauncherWindowFromMain();
        }
    });

    // @ts-expect-error Custom event
    window.on('restart-window', () => window.reload());

    return window;
};

export const hideLauncherWindow = () => {
    launcherWindow?.hide();
};

const getSizeOptions = (app: LaunchableApp) => {
    // Legacy, this should be kept for at least two more versions after NCD 5.2.0, so it keeps on working with versions of the Quick Start app which do not yet have the property fixedSize.
    if (isQuickStartApp(app)) {
        return {
            width: 800,
            height: 550,
            useContentSize: true,
            resizable: false,
        };
    }

    if (hasFixedSize(app)) {
        return {
            ...app.fixedSize,
            useContentSize: true,
            resizable: false,
        };
    }

    const lastWindowState = getLastWindowState(app.name);

    const { x, y } = keepPositionWithinBounds(lastWindowState);
    const { width, height } = lastWindowState;

    return {
        x,
        y,
        width,
        height,
        minHeight: 500,
        minWidth: 760,
    };
};

export const openAppWindow = (app: LaunchableApp, args: string[]) => {
    const template = app.html
        ? `file://${join(
              app.installed.path,
              app.html,
          )}?launcherPath=${encodeURIComponent(electronApp.getAppPath())}`
        : `file://${getBundledResourcePath()}/app.html?appPath=${encodeURIComponent(
              app.installed.path,
          )}`;

    const appWindow = createWindow(
        {
            title: `${app.displayName || app.name} v${app.currentVersion}`,
            url: template,
            icon: getAppIcon(app),
            show: true,
            backgroundColor: '#fff',
            ...getSizeOptions(app),
        },
        args,
    );

    appWindows.push({
        browserWindow: appWindow,
        app,
    });

    if (!isQuickStartApp(app)) {
        const isMaximized = getLastWindowState(app.name).maximized;
        if (isMaximized) maximizeWindow(appWindow);

        storeWindowPositionOnClose(appWindow, app.name);
    }

    let reloading = false;

    appWindow.on('closed', () => {
        const index = appWindows.findIndex(
            appWin => appWin.browserWindow === appWindow,
        );
        if (index > -1) {
            appWindows.splice(index, 1);
        }
        if (
            appWindows.length === 0 &&
            !launcherWindow?.isVisible() &&
            !reloading
        ) {
            electronApp.quit();
        }
    });

    // @ts-expect-error Custom event
    appWindow.on('restart-window', () => {
        if (reloading) {
            return;
        }
        reloading = true;
        appWindow.close();
    });

    appWindow.once('closed', () => {
        if (!reloading) return;
        openAppWindow(app, args);
        reloading = false;
    });

    // @ts-expect-error Custom event
    appWindow.on('restart-cancelled', () => {
        reloading = false;
    });
};

export const openApp = (app: AppSpec, openAppOptions?: OpenAppOptions) => {
    const args = mergeAppArguments(appArguments(), openAppOptions);

    if (app.source === LOCAL) {
        openLocalAppWindow(app.name, args);
    } else {
        openDownloadableAppWindow(app, args);
    }
};

export const openInstalledApp = (
    name: string,
    source: SourceName,
    args: string[],
) => {
    openLauncherWindow();
    if (source === LOCAL) {
        const local = getLocalApps(false).find(a => a.name === name);
        if (local) return openAppWindow(local, args);
    } else {
        const app = getDownloadableApps().apps.find(
            a => a.name === name && a.source === source,
        );
        if (app && isInstalled(app)) return openAppWindow(app, args);
    }
    logger.warn(`App "${name}" from source "${source}" is not installed`);
};

export const openDownloadableAppWindow = (appSpec: AppSpec, args: string[]) => {
    const downloadableApp = getDownloadableApps().apps.find(
        app => app.name === appSpec.name && app.source === appSpec.source,
    );

    if (downloadableApp != null && isInstalled(downloadableApp)) {
        openAppWindow(downloadableApp, args);
    } else {
        throw new Error(
            `Tried to open app ${appSpec.name} from source ${appSpec.source}, but it is not installed`,
        );
    }
};

export const openLocalAppWindow = (appName: string, args: string[]) => {
    const localApp = getLocalApps(false).find(app => app.name === appName);

    if (localApp) {
        openAppWindow(localApp, args);
    } else {
        throw new Error(
            `Tried to open local app ${appName}, but it is not installed`,
        );
    }
};

const getAppWindow = (sender: WebContents) => {
    const parentWindow = BrowserWindow.fromWebContents(sender);
    return appWindows.find(appWin => appWin.browserWindow === parentWindow);
};

export const getAppDetails = (webContents: WebContents) => {
    const appWindow = getAppWindow(webContents);

    if (appWindow == null) {
        throw new Error(
            `No app window found for webContents '${webContents.getTitle()}' ${webContents.getURL()}`,
        );
    }

    return {
        coreVersion: packageJson.version,
        corePath: electronApp.getAppPath(),
        homeDir: electronApp.getPath('home'),
        tmpDir: electronApp.getPath('temp'),
        bundledJlink: bundledJlinkVersion,
        ...appWindow.app,
        // Remove at some point in the future when all apps are update to at least shared v39
        path: appWindow.app.installed.path,
    };
};
