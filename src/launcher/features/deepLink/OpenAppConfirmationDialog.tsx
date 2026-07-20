/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback } from 'react';
import { ConfirmationDialog } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { inMain as openAppConfirmation } from '../../../ipc/openAppConfirmation';
import { useLauncherDispatch, useLauncherSelector } from '../../util/hooks';
import {
    getOpenAppConfirmationRequest,
    openAppConfirmationAnswered,
} from './openAppConfirmationSlice';

export default () => {
    const dispatch = useLauncherDispatch();
    const { isVisible, requestId, name, source } = useLauncherSelector(
        getOpenAppConfirmationRequest,
    );

    const answer = useCallback(
        (confirmed: boolean) => {
            if (requestId == null) return;
            openAppConfirmation.answerOpenAppConfirmation(requestId, confirmed);
            dispatch(openAppConfirmationAnswered());
        },
        [dispatch, requestId],
    );

    return (
        <ConfirmationDialog
            isVisible={isVisible}
            title="Open application"
            confirmLabel="Open"
            onConfirm={() => answer(true)}
            onCancel={() => answer(false)}
        >
            <p>{`A link is requesting to open "${name}" from source "${source}".`}</p>
        </ConfirmationDialog>
    );
};
