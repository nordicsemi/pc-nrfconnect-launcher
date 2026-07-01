/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

// Run this as soon as possible, so it is set up for the other modules to be loaded afterwards
import './setUserDataDir';

import { initialize as initializeElectronRemote } from '@electron/remote/main';
import telemetry from '@nordicsemiconductor/pc-nrfconnect-shared/src/telemetry/telemetry';
import { app } from 'electron';

import { migrateSourcesJson } from './apps/dataMigration/migrateSourcesJson';
import { migrateSourcesVersionedJson } from './apps/dataMigration/migrateSourcesVersionedJson';
import configureElectronApp from './configureElectronApp';
import {
    findDeepLink,
    handleDeepLink,
    registerProtocolClient,
} from './deepLink';
import initNrfUtilProxyEnv from './initNrfUtilProxyEnv';
import registerIpcHandler from './registerIpcHandler';
import singeInstanceLock from './singeInstanceLock';
import storeExecutablePath from './storeExecutablePath';

telemetry.enableTelemetry();

registerProtocolClient();

// macOS (cold + warm)
app.on('open-url', (event, url) => {
    event.preventDefault();
    handleDeepLink(url);
});

// Windows / Linux cold start (URL is in argv)
handleDeepLink(findDeepLink(process.argv));

initNrfUtilProxyEnv();
singeInstanceLock();
initializeElectronRemote();
migrateSourcesJson();
migrateSourcesVersionedJson();
registerIpcHandler();
configureElectronApp();
storeExecutablePath();
