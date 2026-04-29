/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import {
    Button,
    Card,
    ExternalLink,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import { type TokenInformation } from '../../../../ipc/artifactoryToken';
import { useLauncherDispatch, useLauncherSelector } from '../../../util/hooks';
import Col from '../../layout/Col';
import Row from '../../layout/Row';
import {
    getArtifactoryTokenInformation,
    showAddArtifactoryToken,
    showRemoveArtifactoryToken,
} from '../settingsSlice';

const Token: React.FC<{ token: TokenInformation }> = ({ token }) => (
    <>
        ID: {token.token_id}
        {token.description != null && (
            <>
                <br />
                Description: {token.description}
            </>
        )}
        {token.expiry != null && (
            <>
                <br />
                Expires: {new Date(token.expiry * 1000).toISOString()}
            </>
        )}
    </>
);

const Authentication: React.FC = () => {
    const dispatch = useLauncherDispatch();

    const token = useLauncherSelector(getArtifactoryTokenInformation);

    return (
        <Card>
            <Card.Header className="tw-flex tw-flex-row tw-items-center tw-justify-between">
                <Card.Header.Title
                    cardTitle="Authentication"
                    className="tw-text-xl"
                />
                <Button
                    variant="primary-outline"
                    size="xl"
                    onClick={() => dispatch(showAddArtifactoryToken())}
                >
                    {token ? 'Replace' : 'Set'} token
                </Button>
            </Card.Header>
            <Card.Body className="tw-gap-4">
                <Row noGutters>
                    {token == null ? (
                        <Col noPadding className="tw-text-sm tw-text-gray-600">
                            To access restricted app sources from Nordic
                            Semiconductor, you need an identity token.
                            Generating a token is described in{' '}
                            <ExternalLink
                                href="https://docs.nordicsemi.com/bundle/nrf-connect-desktop/page/working_with_authentications_tokens.html#generating-a-new-token"
                                label="Working with identity tokens"
                            />
                            .
                        </Col>
                    ) : (
                        <>
                            <Col noPadding className="tw-text-sm">
                                <Token token={token} />
                            </Col>
                            <Col noPadding fixedSize>
                                <Button
                                    variant="secondary"
                                    size="xl"
                                    onClick={() =>
                                        dispatch(showRemoveArtifactoryToken())
                                    }
                                    title="Remove identity token"
                                >
                                    Remove
                                </Button>
                            </Col>
                        </>
                    )}
                </Row>
            </Card.Body>
        </Card>
    );
};

export default Authentication;
