/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import {
    Card,
    colors,
    ExternalLink,
    Toggle,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { inMain } from '../../../../ipc/launcherUpdate';
import { useLauncherDispatch, useLauncherSelector } from '../../../util/hooks';
import {
    getUseChineseAppServer,
    setUseChineseAppServer,
} from '../settingsSlice';

const { white } = colors;

const ChineseAppServer: React.FC = () => {
    const dispatch = useLauncherDispatch();

    const useChineseAppServer = useLauncherSelector(getUseChineseAppServer);

    return (
        <Card>
            <Card.Header>
                <Card.Header.Title
                    cardTitle="Mainland China server"
                    className="tw-text-xl"
                />
            </Card.Header>
            <Card.Body className="tw-gap-4">
                <p className="tw-text-sm tw-text-gray-600">
                    You can enable the server{' '}
                    <ExternalLink href="https://files.nordicsemi.cn/" /> for
                    installing and updating nRF Connect for Desktop and its
                    apps. This server has a better connection in the
                    People&apos;s Republic of China.
                </p>
                <Toggle
                    label="Use Mainland China server"
                    onToggle={() => {
                        dispatch(setUseChineseAppServer(!useChineseAppServer));
                        inMain.setUseChineseUpdateServer(!useChineseAppServer);
                    }}
                    isToggled={useChineseAppServer}
                    variant="primary"
                    handleColor={white}
                />
            </Card.Body>
        </Card>
    );
};

export default ChineseAppServer;
