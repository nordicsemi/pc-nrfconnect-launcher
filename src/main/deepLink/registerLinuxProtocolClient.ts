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

const applicationsDir = () =>
    path.join(
        process.env.XDG_DATA_HOME ?? path.join(os.homedir(), '.local/share'),
        'applications',
    );

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
        `Icon=${getNrfConnectForDesktopIcon()}`,
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
