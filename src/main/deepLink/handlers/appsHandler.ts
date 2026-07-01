/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    OFFICIAL,
    type SourceName,
} from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/sources';
import { dialog } from 'electron';

import { logger } from '../../log';
import { openInstalledApp } from '../../windows';

export const handleOpenAppDeepLink = async (url: URL) => {
    const name = decodeURIComponent(
        url.pathname.replace(/^\/open\//, '').split('/')[0],
    );
    if (!name) return logger.warn('Open-app deep link without app name');
    const source = (url.searchParams.get('source') ?? OFFICIAL) as SourceName;
    const args: string[] = [];
    url.searchParams.forEach((v, k) => {
        if (k !== 'source') args.push(`--${k}`, v);
    });

    const { response } = await dialog.showMessageBox({
        type: 'question',
        buttons: ['Cancel', 'Open'],
        defaultId: 1, // Enter -> Open
        cancelId: 0, // Esc -> Cancel
        title: 'Open application',
        message: `Open "${name}"?`,
        detail: `A link is requesting to open "${name}" from source "${source}".`,
    });

    if (response !== 1) {
        logger.info(`User declined deep-link open of "${name}"`);
        return;
    }

    openInstalledApp(name, source, args);
};
