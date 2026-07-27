/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import {
    type AuthState,
    inMain as auth,
} from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';

import { useLauncherDispatch, useLauncherSelector } from '../../../util/hooks';
import Card from '../../layout/Card';
import Col from '../../layout/Col';
import Row from '../../layout/Row';
import { logIn, logOut, refreshAccount } from '../settingsEffects';
import { getAccount } from '../settingsSlice';

export default () => {
    const dispatch = useLauncherDispatch();
    const [authState, setAuthState] = useState<AuthState | null>(null);
    const account = useLauncherSelector(getAccount);

    useEffect(() => {
        dispatch(refreshAccount());

        auth.registerOnStateChanged(state => {
            setAuthState(state);
            dispatch(refreshAccount());
        });
    }, [dispatch]);

    const button = account ? (
        <Button
            variant="outline-secondary"
            disabled={authState?.status === 'signingOut'}
            onClick={() => dispatch(logOut())}
        >
            Log out
        </Button>
    ) : (
        <Button
            variant="outline-primary"
            disabled={authState?.status === 'signingIn'}
            onClick={() => dispatch(logIn())}
        >
            {authState?.status === 'signingIn'
                ? 'Logging in…'
                : 'Log in / Sign up'}
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
