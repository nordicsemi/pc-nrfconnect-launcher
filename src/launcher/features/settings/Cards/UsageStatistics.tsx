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

import { useLauncherDispatch, useLauncherSelector } from '../../../util/hooks';
import Col from '../../layout/Col';
import Row from '../../layout/Row';
import { toggleSendingTelemetry } from '../../telemetry/telemetryEffects';
import {
    getIsSendingTelemetry,
    showTelemetryDialog,
} from '../../telemetry/telemetrySlice';

const { white } = colors;

const UsageStatistics: React.FC = () => {
    const dispatch = useLauncherDispatch();

    const isSendingTelemetry = useLauncherSelector(getIsSendingTelemetry);

    return (
        <Card>
            <Card.Header>
                <Card.Header.Title
                    cardTitle="Usage statistics"
                    className="tw-text-xl"
                />
            </Card.Header>
            <Card.Body>
                <Row noGutters className="tw-items-center">
                    <Col noPadding>
                        <Toggle
                            id="checkForShare"
                            label="Collect anonymous usage data"
                            onToggle={() => dispatch(toggleSendingTelemetry())}
                            isToggled={isSendingTelemetry}
                            variant="primary"
                            handleColor={white}
                        />
                    </Col>
                    <Col noPadding fixedSize>
                        <Button
                            variant="primary-outline"
                            size="xl"
                            onClick={() => dispatch(showTelemetryDialog())}
                        >
                            Show agreement
                        </Button>
                    </Col>
                </Row>
            </Card.Body>
        </Card>
    );
};

export default UsageStatistics;
