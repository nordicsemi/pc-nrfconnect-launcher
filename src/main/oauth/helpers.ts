/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import * as auth from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';

import { getAllWindowWebContents } from '../windows';

export const notifyAuthStateChanged = (state: auth.AuthState) => {
    auth.forRenderer.broadcastStateChanged(getAllWindowWebContents(), state);
};
