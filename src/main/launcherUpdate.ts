/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    autoUpdater,
    CancellationToken,
    type ProgressInfo,
} from 'electron-updater';
import { createLogger, transports } from 'winston';

import {
    getUpdateChannel,
    getUseChineseAppServer,
} from '../common/persistedStore';
import { inRenderer } from '../ipc/launcherUpdateProgress';
import * as showError from '../ipc/showErrorDialog';
import { getUserDataPath } from './config';

let installCancellationToken: CancellationToken | undefined;

const nrfConnectPath = getUserDataPath('logs');
const logger = createLogger({
    transports: [
        new transports.File({
            dirname: nrfConnectPath,
            filename: 'autoUpdate.log',
            level: 'info',
        }),
    ],
});

export const setUseChineseUpdateServer = (useChineseServer: boolean) => {
    const autoupdateDomain = useChineseServer ? 'cn' : 'com';

    autoUpdater.setFeedURL(
        `https://files.nordicsemi.${autoupdateDomain}/artifactory/swtools/external/ncd/launcher/`,
    );
};

export const checkForUpdate = async () => {
    const updateCheckResult = await autoUpdater.checkForUpdates();
    if (!updateCheckResult) {
        logger.warn(
            'Not checking for nRF Connect for Desktop updates. ' +
                'Auto update is not yet supported for this platform.',
        );
        throw new Error('Auto update not supported');
    }

    // The result is returned whether or not an update is available;
    // isUpdateAvailable tells which of the two it is.
    const { updateInfo, isUpdateAvailable } = updateCheckResult;
    return {
        isUpdateAvailable,
        newVersion: updateInfo.version,
    };
};

export const startUpdate = () => {
    if (installCancellationToken !== undefined) {
        showError.inRenderer.showErrorDialog(
            'Download was requested but another download operation is ' +
                'already in progress.',
        );
        return;
    }

    inRenderer.updateStarted();

    autoUpdater.on('download-progress', (progressObj: ProgressInfo) => {
        inRenderer.updateProgress(progressObj.percent);
    });

    autoUpdater.on('update-downloaded', () => {
        inRenderer.updateFinished(true);
        installCancellationToken = undefined;
        autoUpdater.removeAllListeners();
        autoUpdater.quitAndInstall();
    });

    autoUpdater.on('error', err => {
        inRenderer.updateFinished(false);
        installCancellationToken = undefined;
        autoUpdater.removeAllListeners();
        if (err.message !== 'cancelled') {
            showError.inRenderer.showErrorDialog(err.message);
        }
    });

    installCancellationToken = new CancellationToken();
    autoUpdater.downloadUpdate(installCancellationToken);
};

export const cancelUpdate = () => {
    if (installCancellationToken !== undefined) {
        installCancellationToken.cancel();
        installCancellationToken = undefined;
    } else {
        showError.inRenderer.showErrorDialog(
            'Unable to cancel. No download is in progress.',
        );
    }
};

autoUpdater.autoDownload = false;
autoUpdater.logger = logger;

const updateChannel = getUpdateChannel();
if (updateChannel != null) {
    autoUpdater.channel = updateChannel;
}

setUseChineseUpdateServer(getUseChineseAppServer());
