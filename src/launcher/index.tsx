/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Provider } from 'react-redux';
import {
    logger,
    render,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { setNrfutilLogger } from '@nordicsemiconductor/pc-nrfconnect-shared/nrfutil';

import { startLauncherInitialisation } from './features/process/initialiseLauncher';
import Root from './Root';
import store from './store';
import registerIpcHandler from './util/registerIpcHandler';

import '../../resources/css/launcher.scss';

logger.initialise();
setNrfutilLogger(logger);
telemetry.setLogger(logger);

telemetry.enableTelemetry();
const { dispatch } = store;
registerIpcHandler(dispatch);

render(
    <Provider store={store}>
        <Root />
    </Provider>,
);

dispatch(startLauncherInitialisation());
