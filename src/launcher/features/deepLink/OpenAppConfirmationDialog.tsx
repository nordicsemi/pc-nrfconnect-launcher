/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useCallback } from 'react';
import {
    DialogButton,
    GenericDialog,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { isInstalled, isWithdrawn } from '../../../ipc/apps';
import { inMain as openAppConfirmation } from '../../../ipc/openAppConfirmation';
import { useLauncherDispatch, useLauncherSelector } from '../../util/hooks';
import { installDownloadableApp } from '../apps/appsEffects';
import {
    getDownloadableApp,
    getHaveDownloadableAppsLoaded,
    isInProgress,
} from '../apps/appsSlice';
import {
    getOpenAppConfirmationRequest,
    openAppConfirmationAnswered,
} from './openAppConfirmationSlice';

export default () => {
    const dispatch = useLauncherDispatch();
    const { isVisible, requestId, name, source } = useLauncherSelector(
        getOpenAppConfirmationRequest,
    );
    const haveAppsLoaded = useLauncherSelector(getHaveDownloadableAppsLoaded);
    const app = useLauncherSelector(getDownloadableApp({ name, source }));
    // Boolean() avoids isInProgress narrowing `app` to never in other branches
    const isBusy = Boolean(app && isInProgress(app));
    const appToInstall =
        app != null && !isInstalled(app) && !isWithdrawn(app) && !isBusy
            ? app
            : undefined;
    const canConfirm = haveAppsLoaded && !isBusy;

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

    let message: string;
    if (!haveAppsLoaded) {
        message = `A link is requesting to open "${name}" from source "${source}". Loading app list…`;
    } else if (isBusy) {
        message = `A link is requesting to open "${app?.displayName ?? name}" from source "${source}", which is currently being installed or updated. Please wait…`;
    } else if (appToInstall) {
        message = `A link is requesting to open "${appToInstall.displayName}" from source "${source}", which is not installed yet. Install it now?`;
    } else {
        message = `A link is requesting to open "${name}" from source "${source}".`;
    }

    return (
        <GenericDialog
            isVisible={isVisible}
            onHide={() => answer(false)}
            closeOnEsc
            title={appToInstall ? 'Install application' : 'Open application'}
            showSpinner={!canConfirm}
            footer={
                <>
                    <DialogButton
                        variant="primary"
                        onClick={confirm}
                        disabled={!canConfirm}
                    >
                        {appToInstall ? 'Install and open' : 'Open'}
                    </DialogButton>
                    <DialogButton onClick={() => answer(false)}>
                        Cancel
                    </DialogButton>
                </>
            }
        >
            <p>{message}</p>
        </GenericDialog>
    );
};
