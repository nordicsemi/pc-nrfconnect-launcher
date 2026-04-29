/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Button } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { useLauncherDispatch, useLauncherSelector } from '../../util/hooks';
import { updateDownloadableApp } from '../apps/appsEffects';
import { getUpdatableVisibleApps } from '../apps/appsSlice';

type PickedUpdateAllAppsProps = 'ref' | 'className';

type UpdateAllAppsProps = Pick<
    React.ComponentPropsWithRef<'button'>,
    PickedUpdateAllAppsProps
>;

const UpdateAllApps: React.FC<UpdateAllAppsProps> = ({ ...attrs }) => {
    const dispatch = useLauncherDispatch();
    const updatableApps = useLauncherSelector(getUpdatableVisibleApps);

    const updateAllApps = () =>
        updatableApps.forEach(app => {
            dispatch(updateDownloadableApp(app));
        });

    if (updatableApps.length === 0) return null;

    return (
        <Button
            variant="secondary"
            size="xl"
            onClick={updateAllApps}
            {...attrs}
        >
            Update all apps
        </Button>
    );
};

export default UpdateAllApps;
