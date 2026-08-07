/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import * as auth from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';

import { getAllWindowWebContents } from '../windows';

let lastAuthState: auth.AuthState | undefined;

export const notifyAuthStateChanged = (state: auth.AuthState) => {
    lastAuthState = state;
    auth.forRenderer.broadcastStateChanged(getAllWindowWebContents(), state);
};

export const getLastAuthState = () => lastAuthState;
