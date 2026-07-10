/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

// Run this as soon as possible, so it is set up for the other modules to be loaded afterwards
import './setUserDataDir';

import { initialize as initializeElectronRemote } from '@electron/remote/main';
import telemetry from '@nordicsemiconductor/pc-nrfconnect-shared/src/telemetry/telemetry';

import { migrateSourcesJson } from './apps/dataMigration/migrateSourcesJson';
import { migrateSourcesVersionedJson } from './apps/dataMigration/migrateSourcesVersionedJson';
import configureElectronApp from './configureElectronApp';
import { handleDeepLinkFromArgv, registerDeepLinkHandling } from './deepLink';
import initNrfUtilProxyEnv from './initNrfUtilProxyEnv';
import registerIpcHandler from './registerIpcHandler';
import singeInstanceLock from './singeInstanceLock';
import storeExecutablePath from './storeExecutablePath';

telemetry.enableTelemetry();

registerDeepLinkHandling();
handleDeepLinkFromArgv();

initNrfUtilProxyEnv();
singeInstanceLock();
initializeElectronRemote();
migrateSourcesJson();
migrateSourcesVersionedJson();
registerIpcHandler();
configureElectronApp();
storeExecutablePath();
