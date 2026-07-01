/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { app } from 'electron';
import path from 'path';

export const DEEPLINK_SCHEME = 'nrfconnectfordesktop';

export const registerProtocolClient = () => {
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
};
