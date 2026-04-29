/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Button } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { isInstalled, isWithdrawn } from '../../../../ipc/apps';
import { useLauncherDispatch } from '../../../util/hooks';
import { installDownloadableApp } from '../appsEffects';
import { type DisplayedApp, isInProgress } from '../appsSlice';

type PickedInstallAppProps = 'ref' | 'className';

interface InstallAppProps extends Pick<
    React.ComponentPropsWithRef<'button'>,
    PickedInstallAppProps
> {
    app: DisplayedApp;
}

const InstallApp: React.FC<InstallAppProps> = ({ app, ...attrs }) => {
    const dispatch = useLauncherDispatch();
    if (isInstalled(app) || isWithdrawn(app)) return null;

    return (
        <Button
            variant="secondary"
            size="xl"
            title={`Install ${app.displayName}`}
            disabled={isInProgress(app)}
            onClick={() => dispatch(installDownloadableApp(app))}
            {...attrs}
        >
            {app.progress.isInstalling ? 'Installing…' : 'Install'}
        </Button>
    );
};

export default InstallApp;
