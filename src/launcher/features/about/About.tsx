/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { app } from '@electron/remote';
import {
    Button,
    Card,
    openUrl,
} from '@nordicsemiconductor/pc-nrfconnect-shared';

import WithScrollbarContainer from '../../util/WithScrollbarContainer';

const appVersion = app.getVersion();
const docLink =
    'https://docs.nordicsemi.com/bundle/nrf-connect-desktop/page/index.html';

export default () => (
    <WithScrollbarContainer>
        <div className="tw-flex tw-flex-col tw-gap-4">
            <Card>
                <Card.Header>
                    <Card.Header.Title
                        cardTitle="Version"
                        className="tw-text-xl"
                    />
                </Card.Header>
                <Card.Body>
                    <p>nRF Connect for Desktop v{appVersion}</p>
                </Card.Body>
            </Card>
            <Card>
                <Card.Header>
                    <Card.Header.Title
                        cardTitle="Documentation"
                        className="tw-text-xl"
                    />
                </Card.Header>
                <Card.Body className="tw-items-start">
                    <Button
                        variant="link-button"
                        size="xl"
                        onClick={() => openUrl(docLink)}
                    >
                        Open documentation
                    </Button>
                </Card.Body>
            </Card>
            <Card>
                <Card.Header>
                    <Card.Header.Title
                        cardTitle="License"
                        className="tw-text-xl"
                    />
                </Card.Header>
                <Card.Body className="tw-gap-4 tw-text-justify">
                    <p>Copyright (c) 2015-2024 Nordic Semiconductor ASA</p>
                    <p>All rights reserved.</p>
                    <p>SPDX-License-Identifier: Nordic-4-Clause</p>
                    <p>
                        Use in source and binary forms, redistribution in binary
                        form only, with or without modification, are permitted
                        provided that the following conditions are met:
                    </p>
                    <ol className="tw-flex tw-list-decimal tw-flex-col tw-gap-4 tw-pl-10">
                        <li>
                            <p>
                                Redistributions in binary form, except as
                                embedded into a Nordic Semiconductor ASA
                                integrated circuit in a product or a software
                                update for such product, must reproduce the
                                above copyright notice, this list of conditions
                                and the following disclaimer in the
                                documentation and/or other materials provided
                                with the distribution.
                            </p>
                        </li>

                        <li>
                            <p>
                                Neither the name of Nordic Semiconductor ASA nor
                                the names of its contributors may be used to
                                endorse or promote products derived from this
                                software without specific prior written
                                permission.
                            </p>
                        </li>

                        <li>
                            <p>
                                This software, with or without modification,
                                must only be used with a Nordic Semiconductor
                                ASA integrated circuit.
                            </p>
                        </li>

                        <li>
                            <p>
                                Any software provided in binary form under this
                                license must not be reverse engineered,
                                decompiled, modified and/or disassembled.
                            </p>
                        </li>
                    </ol>
                    <p>
                        THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA
                        &quot;AS IS&quot; AND ANY EXPRESS OR IMPLIED BUT NOT
                        LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY,
                        NONINFRINGEMENT, AND FITNESS FOR A FITNESS FOR A
                        PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL
                        NORDIC SEMICONDUCTOR ASA OR CONTRIBUTORS BE LIABLE FOR
                        ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR
                        CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
                        PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF
                        USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
                        CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
                        CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
                        NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE
                        USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY
                        OF SUCH DAMAGE.
                    </p>
                </Card.Body>
            </Card>
        </div>
    </WithScrollbarContainer>
);
