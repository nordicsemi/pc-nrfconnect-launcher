/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { type InstalledDownloadableApp } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { getAutoUpdateEnabled } from '../../../common/persistedStore';
import { type App, inMain, isQuickStartApp } from '../../../ipc/apps';
import type { AppThunk } from '../../store';
import { addDownloadableApps } from '../apps/appsSlice';

export const isAutoUpdatingApp = (app?: App): app is InstalledDownloadableApp =>
    app != null &&
    (('autoUpdate' in app && !!app.autoUpdate) ||
        // We want to force people onto the auto updatable quickstart
        isQuickStartApp(app));

export const checkForUpdatableApps =
    (
        appsToBeChecked: InstalledDownloadableApp[],
    ): AppThunk<Promise<InstalledDownloadableApp[]>> =>
    async dispatch => {
        const autoUpdatingApps = appsToBeChecked
            .filter(isAutoUpdatingApp)
            .filter(app => getAutoUpdateEnabled(app.name, app.source));
        if (autoUpdatingApps.length === 0) return [];

        const { apps: appsToBeUpdated } =
            await inMain.checkForAppsUpdate(autoUpdatingApps);
        if (appsToBeUpdated.length)
            dispatch(addDownloadableApps(appsToBeUpdated));
        return appsToBeUpdated as InstalledDownloadableApp[];
    };
