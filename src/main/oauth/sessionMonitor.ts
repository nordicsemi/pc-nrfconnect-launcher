/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { getActiveAccountInfo, validateSession } from './session';

const THROTTLE_MS = 10_000;
let validating: Promise<void> | null = null;
let lastCheck = 0;

export const triggerAuthValidate = (): Promise<void> => {
    if (validating) return validating;
    if (Date.now() - lastCheck < THROTTLE_MS) return Promise.resolve();

    validating = (async () => {
        const account = await getActiveAccountInfo();
        if (!account.status) return;

        lastCheck = Date.now();
        await validateSession();
    })().finally(() => {
        validating = null;
    });

    return validating;
};
