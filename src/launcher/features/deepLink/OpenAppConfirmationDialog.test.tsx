/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { OFFICIAL } from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/sources';
import { screen } from '@testing-library/react';

import {
    createDownloadableTestApp,
    createUninstalledTestApp,
} from '../../../test/testFixtures';
import render from '../../../test/testrenderer';
import {
    addDownloadableApps,
    downloadableAppsLoaded,
    installDownloadableAppStarted,
} from '../apps/appsSlice';
import OpenAppConfirmationDialog from './OpenAppConfirmationDialog';
import { openAppConfirmationRequested } from './openAppConfirmationSlice';

const requested = openAppConfirmationRequested({
    requestId: 'req',
    name: 'dummy',
    source: OFFICIAL,
});
const uninstalledApp = createUninstalledTestApp('dummy');

describe('OpenAppConfirmationDialog', () => {
    it('waits for the app list to load before deciding', () => {
        render(<OpenAppConfirmationDialog />, [requested]);

        expect(screen.getByText(/Loading app list/)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled();
    });

    it('offers to install an uninstalled app', () => {
        render(<OpenAppConfirmationDialog />, [
            addDownloadableApps([uninstalledApp]),
            downloadableAppsLoaded(),
            requested,
        ]);

        expect(
            screen.getByRole('button', { name: 'Install and open' }),
        ).toBeEnabled();
    });

    it('blocks confirming while the app is already being installed', () => {
        render(<OpenAppConfirmationDialog />, [
            addDownloadableApps([uninstalledApp]),
            downloadableAppsLoaded(),
            installDownloadableAppStarted(uninstalledApp),
            requested,
        ]);

        expect(
            screen.getByText(/currently being installed/),
        ).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Open' })).toBeDisabled();
    });

    it('offers to open an installed app', () => {
        render(<OpenAppConfirmationDialog />, [
            addDownloadableApps([createDownloadableTestApp('dummy')]),
            downloadableAppsLoaded(),
            requested,
        ]);

        expect(screen.getByRole('button', { name: 'Open' })).toBeEnabled();
    });
});
