/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Button } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { isInstalled } from '../../../../ipc/apps';
import { useLauncherDispatch } from '../../../util/hooks';
import { checkCompatibilityThenLaunch } from '../appsEffects';
import { type DisplayedApp, isInProgress } from '../appsSlice';

type PickedOpenAppProps = 'ref' | 'className';

interface OpenAppProps extends Pick<
    React.ComponentPropsWithRef<'button'>,
    PickedOpenAppProps
> {
    app: DisplayedApp;
}

const OpenApp: React.FC<OpenAppProps> = ({ app, ...attrs }) => {
    const dispatch = useLauncherDispatch();

    if (!isInstalled(app)) return null;

    return (
        <Button
            variant="primary"
            size="xl"
            title={`Open ${app.displayName}`}
            disabled={isInProgress(app)}
            onClick={() => dispatch(checkCompatibilityThenLaunch(app))}
            {...attrs}
        >
            Open
        </Button>
    );
};

export default OpenApp;
