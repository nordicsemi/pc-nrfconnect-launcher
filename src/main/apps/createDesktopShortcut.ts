/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { app as electronApp, shell } from 'electron';
import Mustache from 'mustache';
import path from 'path';
import { uuid } from 'short-uuid';

import { OFFICIAL } from '../../common/sources';
import { isDownloadable, type LaunchableApp } from '../../ipc/apps';
import { inRenderer } from '../../ipc/showErrorDialog';
import argv from '../argv';
import { chmod, chmodDir, copy, readFile, untar, writeFile } from '../fileUtil';
import { getShortcutIcon } from '../icons';

const getDesktopDir = () => electronApp.getPath('desktop');

const getElectronExePath = () =>
    process.env.APPIMAGE || electronApp.getPath('exe');

const sourceName = (app: LaunchableApp) => {
    if (isDownloadable(app)) {
        if (app.source === OFFICIAL) {
            return '';
        }
        return ` (${app.source})`;
    }

    return ' (Local)';
};

const getFileName = (app: LaunchableApp) =>
    `${app.displayName || app.name}${sourceName(app)}`;

const arg = (name: string, argument: string) => [`--${name}`, `"${argument}"`];

const appNameArg = (app: LaunchableApp) =>
    arg(
        isDownloadable(app) ? 'open-downloadable-app' : 'open-local-app',
        app.name,
    );

const sourceArg = (app: LaunchableApp) => arg('source', app.source);

const maybeAppsRootDirArg = () => {
    if (argv['apps-root-dir'] == null) {
        return [];
    }

    return arg('apps-root-dir', argv['apps-root-dir']);
};

const maybeUserDataDirArg = () => {
    if (argv['user-data-dir'] == null) {
        return [];
    }

    return arg('user-data-dir', argv['user-data-dir']);
};

const getArgs = (app: LaunchableApp) =>
    [
        '--args',
        appNameArg(app),
        sourceArg(app),
        maybeAppsRootDirArg(),
        maybeUserDataDirArg(),
    ]
        .flat()
        .join(' ');

const createShortcutForWindows = (app: LaunchableApp) => {
    const fileName = getFileName(app);
    const filePath = path.join(getDesktopDir(), `${fileName}.lnk`);
    const icon = getShortcutIcon(app);
    if (icon) {
        const shortcutStatus = shell.writeShortcutLink(filePath, {
            target: getElectronExePath(),
            args: getArgs(app),
            icon,
            // iconIndex has to be set to change icon
            iconIndex: 0,
        });
        if (shortcutStatus !== true) {
            inRenderer.showErrorDialog('Fail with shell.writeShortcutLink');
        }
    } else {
        inRenderer.showErrorDialog(
            'Fail to create desktop: Unable to determine an icon',
        );
    }
};

const createShortcutForLinux = (app: LaunchableApp) => {
    const fileName = getFileName(app);
    const desktopFilePath = path.join(getDesktopDir(), `${fileName}.desktop`);
    const applicationsFilePath = path.join(
        electronApp.getPath('home'),
        '.local',
        'share',
        'applications',
        `${fileName}.desktop`,
    );

    const args = getArgs(app);
    const icon = getShortcutIcon(app);

    const shortcutContent = [
        '[Desktop Entry]',
        'Encoding=UTF-8',
        `Version=${app.currentVersion}`,
        `Name=${fileName}`,
        `Exec="${getElectronExePath()}" ${args}`,
        'Terminal=false',
        `Icon=${icon}`,
        'Type=Application',
        '',
    ].join('\n');

    try {
        writeFile(desktopFilePath, shortcutContent);
        chmod(desktopFilePath);
        writeFile(applicationsFilePath, shortcutContent);
        chmod(applicationsFilePath);
    } catch (err) {
        inRenderer.showErrorDialog(
            `Fail to create desktop shortcut on Linux with error: ${err}`,
        );
    }
};

/*
 * Create desktop shortcut on MacOS
 * Template is located at /resources/mac/template.app.
 * Copy this template to a tmp folder first.
 * Change the content inside.
 * Copy the modified one to launchpad and desktop.
 * Change the mode of binary file to executable.
 *
 * Copying template to a tmp folder first is to avoid icon cache on MacOS.
 */
const createShortcutForMacOS = async (app: LaunchableApp) => {
    const fileName = getFileName(app);
    let filePath = path.join(getDesktopDir(), `${fileName}.app`);
    const templateName = `template-${uuid()}.app`;
    const appTemplateTarPath = path.join(
        electronApp.getAppPath(),
        '/resources/mac/template.tar.gz',
    );
    const tmpAppPath = path.join(
        electronApp.getPath('temp'),
        'com.nordicsemi.nrfconnect',
    );
    const tmpAppTemplatePath = path.join(tmpAppPath, templateName);
    const appExecPath = path.join(filePath, '/Contents/MacOS/Application Stub');
    const icnsPath = path.join(
        tmpAppTemplatePath,
        '/Contents/Resources/icon.icns',
    );

    try {
        // Untar template
        await untar(appTemplateTarPath, tmpAppTemplatePath, 1);
        await chmodDir(tmpAppTemplatePath);

        // Create Info.plist
        const infoTmpPath = path.join(
            tmpAppTemplatePath,
            '/Contents/Info.plist',
        );
        const identifier = `com.nordicsemi.nrfconnect.${app.name}${
            isDownloadable(app) ? '' : '-local'
        }`;
        const infoContentSource = readFile(infoTmpPath);
        Mustache.parse(infoContentSource);
        const infoContentData = {
            identifier,
            fileName,
        };
        const infoContent = Mustache.render(infoContentSource, infoContentData);

        // Create document.wflow
        const wflowTmpPath = path.join(
            tmpAppTemplatePath,
            '/Contents/document.wflow',
        );
        // In MacOS spaces should be replaced
        const shortcutCMD = `${getElectronExePath().replace(
            / /g,
            '\\ ',
        )} ${getArgs(app)}`;
        const wflowContentSource = readFile(wflowTmpPath);
        Mustache.parse(wflowContentSource);
        const wflowContentData = {
            shortcutCMD,
        };
        const wflowContent = Mustache.render(
            wflowContentSource,
            wflowContentData,
        );

        writeFile(infoTmpPath, infoContent);
        writeFile(wflowTmpPath, wflowContent);
        copy(getShortcutIcon(app), icnsPath);

        // Copy to Desktop
        copy(tmpAppTemplatePath, filePath);

        // Copy to Applications
        filePath = path.join(
            electronApp.getPath('home'),
            `/Applications/${fileName}.app/`,
        );
        copy(tmpAppTemplatePath, filePath);

        // Change mode
        await chmodDir(appExecPath);
    } catch (error) {
        inRenderer.showErrorDialog(
            `Error occured while creating desktop shortcut on MacOS with error: ${error}`,
        );
    }
};

export default (app: LaunchableApp) => {
    switch (process.platform) {
        case 'win32':
            createShortcutForWindows(app);
            break;
        case 'linux':
            createShortcutForLinux(app);
            break;
        case 'darwin':
            createShortcutForMacOS(app);
            break;
        default:
            inRenderer.showErrorDialog(
                'Your operating system is neither Windows, Linux, nor macOS',
            );
    }
};
