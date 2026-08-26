/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { type SourceName } from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/sources';
import { uuid } from 'short-uuid';

import { inRenderer as openAppConfirmation } from '../../ipc/openAppConfirmation';

const pendingRequests = new Map<string, (confirmed: boolean) => void>();

export const requestOpenAppConfirmation = (name: string, source: SourceName) =>
    new Promise<boolean>(resolve => {
        const requestId = uuid();
        pendingRequests.set(requestId, resolve);
        openAppConfirmation.requestOpenAppConfirmation(requestId, name, source);
    });

export const answerOpenAppConfirmation = (
    requestId: string,
    confirmed: boolean,
) => {
    const resolve = pendingRequests.get(requestId);
    if (resolve == null) return;

    resolve(confirmed);
    pendingRequests.delete(requestId);
};
