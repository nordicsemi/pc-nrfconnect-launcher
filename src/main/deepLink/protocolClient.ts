/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { app } from 'electron';
import path from 'path';

import { logger } from '../log';
import { registerLinuxAppImageProtocolClient } from './registerLinuxProtocolClient';
import { DEEPLINK_SCHEME, handleDeepLink } from './router';

export const registerDeepLinkHandling = () => {
    if (process.platform === 'linux') {
        // AppImage is not installed into the system, so there is no existing
        // .desktop file for setAsDefaultProtocolClient() to update.
        registerLinuxAppImageProtocolClient(DEEPLINK_SCHEME).catch(error =>
            logger.warn(`Failed to register deep link handler: ${error}`),
        );
        return;
    }

    if (process.defaultApp) {
        // dev / unpackaged
        if (process.argv.length >= 2) {
            app.setAsDefaultProtocolClient(DEEPLINK_SCHEME, process.execPath, [
                path.resolve(process.argv[1]),
            ]);
        }
    } else {
        app.setAsDefaultProtocolClient(DEEPLINK_SCHEME);
    }

    app.on('open-url', (event, url) => {
        event.preventDefault();
        handleDeepLink(url);
    });
};
