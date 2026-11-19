/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback } from 'react';
import { ConfirmationDialog } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { isInstalled, isWithdrawn } from '../../../ipc/apps';
import { inMain as openAppConfirmation } from '../../../ipc/openAppConfirmation';
import { useLauncherDispatch, useLauncherSelector } from '../../util/hooks';
import { installDownloadableApp } from '../apps/appsEffects';
import { getDownloadableApp } from '../apps/appsSlice';
import {
    getOpenAppConfirmationRequest,
    openAppConfirmationAnswered,
} from './openAppConfirmationSlice';

export default () => {
    const dispatch = useLauncherDispatch();
    const { isVisible, requestId, name, source } = useLauncherSelector(
        getOpenAppConfirmationRequest,
    );
    const app = useLauncherSelector(getDownloadableApp({ name, source }));
    const appToInstall =
        app != null && !isInstalled(app) && !isWithdrawn(app) ? app : undefined;
    const needsInstall = appToInstall != null;

    const answer = useCallback(
        (confirmed: boolean) => {
            if (requestId == null) return;
            openAppConfirmation.answerOpenAppConfirmation(requestId, confirmed);
            dispatch(openAppConfirmationAnswered());
        },
        [dispatch, requestId],
    );

    const confirm = useCallback(async () => {
        if (requestId == null) return;
        if (appToInstall == null) return answer(true);

        // Close the dialog right away; install progress shows in the app list.
        dispatch(openAppConfirmationAnswered());
        let installed = false;
        try {
            installed =
                (await dispatch(installDownloadableApp(appToInstall))) != null;
        } finally {
            openAppConfirmation.answerOpenAppConfirmation(requestId, installed);
        }
    }, [answer, appToInstall, dispatch, requestId]);

    return (
        <ConfirmationDialog
            isVisible={isVisible}
            title={needsInstall ? 'Install application' : 'Open application'}
            confirmLabel={needsInstall ? 'Install and open' : 'Open'}
            onConfirm={confirm}
            onCancel={() => answer(false)}
        >
            <p>
                {appToInstall
                    ? `A link is requesting to open "${appToInstall.displayName}" from source "${source}", which is not installed yet. Install it now?`
                    : `A link is requesting to open "${name}" from source "${source}".`}
            </p>
        </ConfirmationDialog>
    );
};
