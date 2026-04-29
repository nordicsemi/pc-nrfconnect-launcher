/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import ButtonToolbar from 'react-bootstrap/ButtonToolbar';
import { Button, Card } from '@nordicsemiconductor/pc-nrfconnect-shared';
import { clipboard } from 'electron';

import { useLauncherDispatch, useLauncherSelector } from '../../../util/hooks';
import Col from '../../layout/Col';
import Row from '../../layout/Row';
import {
    getExternalSourcesSorted,
    showAddSource,
    showRemoveSource,
} from '../../sources/sourcesSlice';

type PickedAppSourcesProps = 'ref' | 'className';

type AppSourcesProps = Pick<
    React.ComponentPropsWithRef<'div'>,
    PickedAppSourcesProps
>;

const AppSources: React.FC<AppSourcesProps> = () => {
    const dispatch = useLauncherDispatch();

    const sources = useLauncherSelector(getExternalSourcesSorted);

    return (
        <Card>
            <Card.Header className="tw-flex tw-flex-row tw-items-center tw-justify-between">
                <Card.Header.Title
                    cardTitle="App sources"
                    className="tw-text-xl"
                />
                <Button
                    variant="primary-outline"
                    size="xl"
                    onClick={() => dispatch(showAddSource())}
                >
                    Add source
                </Button>
            </Card.Header>
            <Card.Body>
                {sources.map(source => (
                    <Row key={source.name} className="tw-mt-4">
                        <Col className="tw-text-md tw-font-medium">
                            {source.name}
                        </Col>
                        <Col fixedSize>
                            <ButtonToolbar>
                                <Button
                                    variant="secondary"
                                    size="xl"
                                    onClick={() =>
                                        clipboard.writeText(source.url)
                                    }
                                    title="Copy URL to clipboard"
                                >
                                    Copy URL
                                </Button>
                                <Button
                                    variant="secondary"
                                    size="xl"
                                    onClick={() =>
                                        dispatch(showRemoveSource(source.name))
                                    }
                                    title="Remove source and associated apps"
                                >
                                    Remove
                                </Button>
                            </ButtonToolbar>
                        </Col>
                    </Row>
                ))}
            </Card.Body>
        </Card>
    );
};

export default AppSources;
