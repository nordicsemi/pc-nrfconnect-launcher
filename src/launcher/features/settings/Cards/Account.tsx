/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useState } from 'react';
import Button from 'react-bootstrap/Button';
import { inMain as auth } from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';

import { useLauncherDispatch, useLauncherSelector } from '../../../util/hooks';
import Card from '../../layout/Card';
import Col from '../../layout/Col';
import Row from '../../layout/Row';
import { logIn, logOut, refreshAccount } from '../settingsEffects';
import { getAccount, getIsLoggingIn } from '../settingsSlice';

export default () => {
    const dispatch = useLauncherDispatch();
    const account = useLauncherSelector(getAccount);
    const isLoggingIn = useLauncherSelector(getIsLoggingIn);
    const [tokenResult, setTokenResult] = useState<string>();

    useEffect(() => {
        dispatch(refreshAccount());
    }, [dispatch]);

    const handleGetToken = async () => {
        const result = await auth.getAccessToken(); // без args → default scopes
        setTokenResult(result.status ? result.data : `Error: ${result.error}`);
    };

    const button = account ? (
        <Button variant="outline-secondary" onClick={() => dispatch(logOut())}>
            Log out
        </Button>
    ) : (
        <Button
            variant="outline-primary"
            disabled={isLoggingIn}
            onClick={() => dispatch(logIn())}
        >
            {isLoggingIn ? 'Logging in…' : 'Log in / Sign up'}
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
            {account && (
                <Row className="tw-mt-4">
                    <Col fixedSize>
                        <Button
                            size="sm"
                            variant="outline-primary"
                            onClick={handleGetToken}
                        >
                            Get access token
                        </Button>
                    </Col>
                </Row>
            )}
            {tokenResult && (
                <Row className="tw-mt-4">
                    <Col className="tw-break-all tw-font-mono tw-text-xs">
                        {tokenResult}
                    </Col>
                </Row>
            )}
        </Card>
    );
};
