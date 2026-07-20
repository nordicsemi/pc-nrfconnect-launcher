/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    OFFICIAL,
    type SourceName,
} from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/sources';

import { logger } from '../../log';
import { openInstalledApp, openLauncherWindow } from '../../windows';
import { requestOpenAppConfirmation } from '../openAppConfirmation';

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

    await openLauncherWindow();

    const confirmed = await requestOpenAppConfirmation(name, source);
    if (!confirmed) {
        logger.info(`User declined deep-link open of "${name}"`);
        return;
    }

    openInstalledApp(name, source, args);
};
