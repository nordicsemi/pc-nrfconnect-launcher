/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Button } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { isUpdatable } from '../../../../ipc/apps';
import { useLauncherDispatch } from '../../../util/hooks';
import { show as showReleaseNotes } from '../../releaseNotes/releaseNotesDialogSlice';
import { type DisplayedApp, isInProgress } from '../appsSlice';

type PickedUpdateAppProps = 'ref' | 'className';

interface UpdateAppProps extends Pick<
    React.ComponentPropsWithRef<'button'>,
    PickedUpdateAppProps
> {
    app: DisplayedApp;
}

const UpdateApp: React.FC<UpdateAppProps> = ({ app, ...attrs }) => {
    const dispatch = useLauncherDispatch();

    if (!isUpdatable(app)) return null;

    return (
        <Button
            variant="primary-outline"
            size="xl"
            title={`Update ${app.displayName}`}
            disabled={isInProgress(app)}
            onClick={() => dispatch(showReleaseNotes(app))}
            {...attrs}
        >
            {app.progress.isUpdating ? 'Updating…' : 'Update'}
        </Button>
    );
};

export default UpdateApp;
