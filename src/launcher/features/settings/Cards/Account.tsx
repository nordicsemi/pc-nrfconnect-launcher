/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import { Spinner } from '@nordicsemiconductor/pc-nrfconnect-shared';
import {
    type AuthState,
    inMain as auth,
} from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';

import { useLauncherDispatch } from '../../../util/hooks';
import Card from '../../layout/Card';
import Col from '../../layout/Col';
import Row from '../../layout/Row';
import { logIn, logOut } from '../settingsEffects';

export default () => {
    const dispatch = useLauncherDispatch();
    const [authState, setAuthState] = useState<AuthState | null>(null);

    useEffect(() => {
        auth.getAuthStatus().then(setAuthState);
        auth.registerOnStateChanged(setAuthState);
    }, []);

    const account = authState?.account;
    const status = authState?.status;

    const button = account ? (
        <Button
            variant="outline-secondary"
            disabled={status === 'signingOut'}
            onClick={() => dispatch(logOut())}
        >
            Log out
        </Button>
    ) : (
        <Button
            variant="outline-primary"
            disabled={status === 'signingIn'}
            onClick={() => dispatch(logIn())}
        >
            {status === 'signingIn' ? (
                <span>
                    <Spinner size="sm" /> Signing in…
                </span>
            ) : (
                'Sign in'
            )}
        </Button>
    );

    return (
        <Card title="My Nordic account" titleButton={button}>
            <Row className="tw-mt-4">
                <Col className="tw-text-sm tw-text-gray-600">
                    {account
                        ? `Signed in as ${account.name ?? account.username}`
                        : 'Sign in with your My Nordic account.'}
                </Col>
            </Row>
        </Card>
    );
};
