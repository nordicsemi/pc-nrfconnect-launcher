/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Button from 'react-bootstrap/Button';
import { app } from '@electron/remote';

import WithScrollbarContainer from '../../util/WithScrollbarContainer';
import Card from '../layout/Card';

const appVersion = app.getVersion();

export default () => (
    <WithScrollbarContainer>
        <Card title="Version">
            <p>nRF Connect for Desktop v{appVersion}</p>
        </Card>
        <Card title="Documentation">
            <Button
                href="https://docs.nordicsemi.com/r/bundle/nrf-connect-for-desktop/page/index.html"
                target="_blank"
                variant="outline-primary"
            >
                Open documentation
            </Button>
        </Card>
        <Card title="License">
            <p>Copyright (c) 2015-2024 Nordic Semiconductor ASA</p>
            <p>All rights reserved.</p>
            <p>SPDX-License-Identifier: Nordic-4-Clause</p>
            <p>
                Use in source and binary forms, redistribution in binary form
                only, with or without modification, are permitted provided that
                the following conditions are met:
            </p>
            <ol>
                <li>
                    <p>
                        Redistributions in binary form, except as embedded into
                        a Nordic Semiconductor ASA integrated circuit in a
                        product or a software update for such product, must
                        reproduce the above copyright notice, this list of
                        conditions and the following disclaimer in the
                        documentation and/or other materials provided with the
                        distribution.
                    </p>
                </li>

                <li>
                    <p>
                        Neither the name of Nordic Semiconductor ASA nor the
                        names of its contributors may be used to endorse or
                        promote products derived from this software without
                        specific prior written permission.
                    </p>
                </li>

                <li>
                    <p>
                        This software, with or without modification, must only
                        be used with a Nordic Semiconductor ASA integrated
                        circuit.
                    </p>
                </li>

                <li>
                    <p>
                        Any software provided in binary form under this license
                        must not be reverse engineered, decompiled, modified
                        and/or disassembled.
                    </p>
                </li>
            </ol>
            <p>
                THIS SOFTWARE IS PROVIDED BY NORDIC SEMICONDUCTOR ASA &quot;AS
                IS&quot; AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT
                NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY,
                NONINFRINGEMENT, AND FITNESS FOR A PARTICULAR PURPOSE ARE
                DISCLAIMED. IN NO EVENT SHALL NORDIC SEMICONDUCTOR ASA OR
                CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
                SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
                LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF
                USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED
                AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT
                LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING
                IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF
                THE POSSIBILITY OF SUCH DAMAGE.
            </p>
        </Card>
    </WithScrollbarContainer>
);
