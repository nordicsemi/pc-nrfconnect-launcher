/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { execFile } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { getNrfConnectForDesktopIcon } from '../icons';
import { logger } from '../log';

const desktopFileName = 'nrfconnect-deeplink.desktop';
const iconFileName = 'nrfconnect.png';

const dataHomeDir = () =>
    process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local/share');

const applicationsDir = () => path.join(dataHomeDir(), 'applications');

/*
 * The bundled icon is stored inside `app.asar`. Only Electron's patched `fs`
 * module can read from an asar archive, but the `Icon=` key of a desktop entry
 * is resolved by the desktop environment, not by Electron. When running from an
 * AppImage the icon additionally lives in the ephemeral `/tmp/.mount_*`
 * directory, which disappears as soon as the app exits. So copy the icon to the
 * user's data directory and reference that copy from the desktop entry.
 */
const installIcon = () => {
    const iconPath = path.join(dataHomeDir(), 'nrfconnect', iconFileName);

    try {
        fs.mkdirSync(path.dirname(iconPath), { recursive: true });
        fs.copyFileSync(getNrfConnectForDesktopIcon(), iconPath);
        return iconPath;
    } catch (error) {
        logger.warn(`Failed to install icon: ${error}`);
        return getNrfConnectForDesktopIcon();
    }
};

// The Exec key follows the quoting rules of the Desktop Entry Specification,
// not shell quoting: https://specifications.freedesktop.org/desktop-entry-spec
const escapeExecValue = (value: string) =>
    value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/%/g, '%%');

const runCommand = (command: string, args: string[]) =>
    new Promise<void>(resolve => {
        execFile(command, args, error => {
            if (error) {
                logger.warn(`Failed to run ${command}: ${error.message}`);
            }
            resolve();
        });
    });

/*
 * AppImage does not install anything into the system, so Electron's
 * app.setAsDefaultProtocolClient() has nothing to register on Linux (it only
 * updates an already-installed .desktop file). We instead write and register
 * our own .desktop file, pointing at the stable AppImage path (process.env.APPIMAGE),
 * since process.execPath is an ephemeral squashfs mount that disappears once
 * the app exits.
 */
export const registerLinuxAppImageProtocolClient = async (scheme: string) => {
    const appImagePath = process.env.APPIMAGE;
    if (!appImagePath) return;

    const dir = applicationsDir();
    fs.mkdirSync(dir, { recursive: true });

    const desktopEntry = [
        '[Desktop Entry]',
        'Name=nRF Connect for Desktop',
        // chrome-sandbox needs to be owned by root with the setuid bit set,
        // which an unprivileged AppImage extraction/mount can never provide.
        `Exec="${escapeExecValue(appImagePath)}" --no-sandbox %u`,
        `Icon=${installIcon()}`,
        'Type=Application',
        'Terminal=false',
        `MimeType=x-scheme-handler/${scheme};`,
        'Categories=Development;',
        '',
    ].join('\n');

    fs.writeFileSync(path.join(dir, desktopFileName), desktopEntry);

    await runCommand('update-desktop-database', [dir]);
    await runCommand('xdg-mime', [
        'default',
        desktopFileName,
        `x-scheme-handler/${scheme}`,
    ]);
};
