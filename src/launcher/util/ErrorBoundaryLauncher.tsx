/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { getCurrentWindow } from '@electron/remote';
import {
    ErrorBoundary,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import pkgJson from '../../../package.json';
import { resetStore } from '../../common/persistedStore';

const ErrorBoundaryLauncher: React.FC<React.PropsWithChildren> = ({
    children,
}) => {
    const restoreDefaults = () => {
        resetStore();
        getCurrentWindow().reload();
    };

    const sendTelemetryEvent = (error: string) => {
        telemetry.sendEvent('Report error', {
            platform: process.platform,
            arch: process.arch,
            launcherVersion: pkgJson.version,
            errorMessage: error,
        });
    };

    return (
        <ErrorBoundary
            appName="Launcher"
            restoreDefaults={restoreDefaults}
            sendTelemetryEvent={sendTelemetryEvent}
        >
            {children}
        </ErrorBoundary>
    );
};

export default ErrorBoundaryLauncher;
