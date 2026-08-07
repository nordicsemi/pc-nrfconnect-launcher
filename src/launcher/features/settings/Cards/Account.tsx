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

import { useLauncherDispatch } from '../../../util/hooks';
import Card from '../../layout/Card';
import Col from '../../layout/Col';
import Row from '../../layout/Row';
import { signIn, signOut } from '../settingsEffects';

export default () => {
    const dispatch = useLauncherDispatch();
    const [authState, setAuthState] = useState<AuthState | null>(null);

    useEffect(() => {
        auth.getAuthStatus().then(setAuthState);
        auth.registerOnStateChanged(setAuthState);
    }, []);

    const status = authState?.status;
    const account = authState?.account;
    const name = account?.name ?? account?.username;

    const showAccountView = status === 'signedIn' || status === 'signingOut';

    const signInLabel = () => {
        if (status === 'signingIn') return 'Signing in…';
        if (status === 'interactionRequired') return 'Sign in again';
        return 'Sign in';
    };

    const buttons = showAccountView ? (
        <Button
            variant="outline-secondary"
            disabled={status === 'signingOut'}
            onClick={() => dispatch(signOut())}
        >
            {status === 'signingOut' ? 'Signing out…' : 'Sign out'}
        </Button>
    ) : (
        <div className="tw-flex tw-flex-row tw-gap-2">
            <Button
                variant="outline-primary"
                disabled={status === 'signingIn'}
                onClick={() => dispatch(signIn())}
            >
                {signInLabel()}
            </Button>
            {status === 'signingIn' && (
                <Button
                    variant="outline-secondary"
                    onClick={() => auth.cancelSignIn()}
                >
                    Cancel
                </Button>
            )}
        </div>
    );

    const body = () => {
        if (showAccountView) return `Signed in as ${name}`;
        if (status === 'interactionRequired')
            return name
                ? `Your session for ${name} expired. Please sign in again.`
                : 'Your session expired. Please sign in again.';
        return 'Sign in with myNordic account.';
    };

    return (
        <Card title="myNordic account" titleButton={buttons}>
            <Row className="tw-mt-4">
                <Col className="tw-text-sm tw-text-gray-600">{body()}</Col>
            </Row>
        </Card>
    );
};
