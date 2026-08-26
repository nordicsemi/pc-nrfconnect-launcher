/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import Button from 'react-bootstrap/Button';
import { logger } from '@nordicsemiconductor/pc-nrfconnect-shared';

import {
    type InstalledDownloadableApp,
    isDownloadable,
    isInstalled,
    isWithdrawn,
} from '../../../../ipc/apps';
import { useLauncherDispatch } from '../../../util/hooks';
import { checkForUpdatableApps } from '../../autoUpdate/autoUpdateDialogEffects';
import {
    hideAutoUpdateDialog,
    showAutoUpdateDialog,
} from '../../autoUpdate/autoUpdateDialogSlice';
import {
    checkCompatibilityThenLaunch,
    updateDownloadableApp,
} from '../appsEffects';
import { type DisplayedApp, isInProgress } from '../appsSlice';

const OpenApp: React.FC<{ app: DisplayedApp }> = ({ app }) => {
    const dispatch = useLauncherDispatch();
    const [openning, setOpening] = useState<boolean>(false);

    if (!isInstalled(app)) return null;

    return (
        <Button
            title={`Open ${app.displayName}`}
            disabled={openning || isInProgress(app)}
            onClick={async () => {
                let updatedApp: InstalledDownloadableApp | undefined;
                if (isDownloadable(app) && !isWithdrawn(app)) {
                    // The reason we don't include it in the compatibility check is due to needing the new app data for updated engine and jlink version in the compatibility check
                    setOpening(true);
                    updatedApp = (await dispatch(checkForUpdatableApps([app]))
                        .then(async updatableApps => {
                            if (updatableApps.length === 1) {
                                dispatch(
                                    showAutoUpdateDialog(
                                        updatableApps[0].displayName,
                                    ),
                                );
                                return await dispatch(
                                    updateDownloadableApp(app, false),
                                )
                                    .catch(err => {
                                        // No other action if it fails
                                        logger.error(err);
                                    })
                                    .finally(() => {
                                        dispatch(hideAutoUpdateDialog());
                                    });
                            }
                        })
                        // Ignore if we fail to check for updates
                        .catch(err => {
                            logger.error(err);
                        })
                        .finally(() => {
                            setOpening(false);
                        })) as InstalledDownloadableApp | undefined; // Typescript is unable to type this correctly
                }

                dispatch(checkCompatibilityThenLaunch(updatedApp ?? app));
            }}
        >
            Open
        </Button>
    );
};

export default OpenApp;
