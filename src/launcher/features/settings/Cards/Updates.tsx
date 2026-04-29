/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import {
    Button,
    Card,
    colors,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import formatDate from 'date-fns/format';

import { useLauncherDispatch, useLauncherSelector } from '../../../util/hooks';
import { getUpdateCheckStatus } from '../../apps/appsSlice';
import { startUpdateProcess } from '../../process/updateProcess';
import {
    getShouldCheckForUpdatesAtStartup,
    setCheckForUpdatesAtStartup,
} from '../settingsSlice';

const { white } = colors;

const Updates: React.FC = () => {
    const dispatch = useLauncherDispatch();

    const shouldCheckForUpdatesAtStartup = useLauncherSelector(
        getShouldCheckForUpdatesAtStartup,
    );

    const { isCheckingForUpdates, lastUpdateCheckDate } =
        useLauncherSelector(getUpdateCheckStatus);

    return (
        <Card>
            <Card.Header className="tw-flex tw-flex-row tw-items-center tw-justify-between">
                <Card.Header.Title cardTitle="Updates" className="tw-text-xl" />
                <Button
                    variant="primary-outline"
                    size="xl"
                    onClick={() => dispatch(startUpdateProcess(true))}
                    disabled={isCheckingForUpdates}
                >
                    {isCheckingForUpdates ? 'Checking…' : 'Check for updates'}
                </Button>
            </Card.Header>
            <Card.Body className="tw-gap-4">
                <p className="small text-muted">
                    {lastUpdateCheckDate && (
                        <>
                            Last update check performed:{' '}
                            {formatDate(
                                lastUpdateCheckDate,
                                'yyyy-MM-dd HH:mm:ss',
                            )}
                        </>
                    )}
                </p>
                <Toggle
                    id="checkForUpdates"
                    label="Check for updates at startup"
                    onToggle={() =>
                        dispatch(
                            setCheckForUpdatesAtStartup(
                                !shouldCheckForUpdatesAtStartup,
                            ),
                        )
                    }
                    isToggled={shouldCheckForUpdatesAtStartup}
                    variant="primary"
                    handleColor={white}
                />
            </Card.Body>
        </Card>
    );
};

export default Updates;
