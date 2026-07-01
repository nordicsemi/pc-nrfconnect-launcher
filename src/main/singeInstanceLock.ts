/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { app } from 'electron/main';

import argv from './argv';
import { openInitialWindow } from './configureElectronApp';
import { findDeepLink, handleDeepLink } from './deepLink';

export default () => {
    if (argv['new-instance']) {
        return;
    }

    const isFirstInstance = app.requestSingleInstanceLock({
        argv: JSON.stringify(argv),
    });

    if (isFirstInstance) {
        app.on(
            'second-instance',
            (_event, argvFromSecondInstance, _wd, message) => {
                const link = findDeepLink(argvFromSecondInstance);
                if (link) {
                    handleDeepLink(link);
                    return; // Don't open a new window if the second instance was launched with a deep link, just handle the link.
                }

                const parsed = JSON.parse((message as { argv: string }).argv);
                openInitialWindow(parsed);
            },
        );
    } else {
        console.log(
            'Other instance already running. Bringing that to the front.',
        );
        app.quit();
        process.exit();
    }
};
