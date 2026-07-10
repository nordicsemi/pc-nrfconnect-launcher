/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { app } from 'electron/main';

import argv from './argv';
import { openInitialWindow } from './configureElectronApp';
import { containsDeepLink, handleDeepLinkFromArgv } from './deepLink';

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
                if (containsDeepLink(argvFromSecondInstance)) {
                    handleDeepLinkFromArgv(argvFromSecondInstance);
                } else {
                    const parsed = JSON.parse(
                        (message as { argv: string }).argv,
                    );
                    openInitialWindow(parsed);
                }
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
