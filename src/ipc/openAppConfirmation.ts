/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import * as mainToRenderer from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/infrastructure/mainToRenderer';
import * as rendererToMain from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/infrastructure/rendererToMain';
import { type SourceName } from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/sources';

const channel = {
    request: 'open-app-confirmation:request',
    response: 'open-app-confirmation:response',
};

type RequestOpenAppConfirmation = (
    requestId: string,
    name: string,
    source: SourceName,
) => void;

const requestOpenAppConfirmation =
    mainToRenderer.send<RequestOpenAppConfirmation>(channel.request);
const registerRequestOpenAppConfirmation =
    mainToRenderer.on<RequestOpenAppConfirmation>(channel.request);

type AnswerOpenAppConfirmation = (
    requestId: string,
    confirmed: boolean,
) => void;

const answerOpenAppConfirmation =
    rendererToMain.send<AnswerOpenAppConfirmation>(channel.response);
const registerAnswerOpenAppConfirmation =
    rendererToMain.on<AnswerOpenAppConfirmation>(channel.response);

export const inRenderer = { requestOpenAppConfirmation };
export const forRenderer = { registerAnswerOpenAppConfirmation };
export const inMain = { answerOpenAppConfirmation };
export const forMain = { registerRequestOpenAppConfirmation };
