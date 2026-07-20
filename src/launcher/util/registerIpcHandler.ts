/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { ErrorDialogActions } from '@nordicsemiconductor/pc-nrfconnect-shared';

import * as appInstallProgress from '../../ipc/appInstallProgress';
import * as installJlink from '../../ipc/jlinkProgress';
import * as launcherUpdateProgress from '../../ipc/launcherUpdateProgress';
import * as openAppConfirmation from '../../ipc/openAppConfirmation';
import * as proxyLogin from '../../ipc/proxyLogin';
import * as showErrorDialog from '../../ipc/showErrorDialog';
import {
    addDownloadableApps,
    initialiseAppInstallProgress,
    resetAppInstallProgress,
    updateAppInstallProgress,
} from '../features/apps/appsSlice';
import { openAppConfirmationRequested } from '../features/deepLink/openAppConfirmationSlice';
import { updateProgress as updateJLinkProgress } from '../features/jlinkUpdate/jlinkUpdateSlice';
import {
    reset,
    startDownload,
    updateDownloading,
} from '../features/launcherUpdate/launcherUpdateSlice';
import { loginRequestedByServer } from '../features/proxyLogin/proxyLoginSlice';
import type { AppDispatch } from '../store';

export default (dispatch: AppDispatch) => {
    appInstallProgress.forMain.registerAppInstallProgress(progress => {
        dispatch(updateAppInstallProgress(progress));
    });
    appInstallProgress.forMain.registerAppInstallStart((app, fractionNames) => {
        dispatch(initialiseAppInstallProgress({ app, fractionNames }));
    });
    appInstallProgress.forMain.registerAppInstallSuccess(app => {
        dispatch(addDownloadableApps([app]));
        dispatch(resetAppInstallProgress(app));
    });

    showErrorDialog.forMain.registerShowErrorDialog(errorMessage => {
        dispatch(ErrorDialogActions.showDialog(errorMessage));
    });

    proxyLogin.forMain.registerRequestProxyLogin((requestId, authInfo) => {
        dispatch(loginRequestedByServer({ requestId, authInfo }));
    });

    launcherUpdateProgress.forMain.registerUpdateStarted(() => {
        dispatch(startDownload());
    });
    launcherUpdateProgress.forMain.registerUpdateProgress(percentage => {
        dispatch(updateDownloading(percentage));
    });
    launcherUpdateProgress.forMain.registerUpdateFinished(() => {
        dispatch(reset());
    });
    installJlink.forMain.registerUpdateJLinkProgress(update => {
        dispatch(updateJLinkProgress(update));
    });

    openAppConfirmation.forMain.registerRequestOpenAppConfirmation(
        (requestId, name, source) => {
            dispatch(openAppConfirmationRequested({ requestId, name, source }));
        },
    );
};
