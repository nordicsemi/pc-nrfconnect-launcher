/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { type SourceName } from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/sources';
import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';

import type { RootState } from '../../store';

export type State = {
    requestId?: string;
    name: string;
    source?: SourceName;
};

const initialState: State = { name: '' };

const slice = createSlice({
    name: 'openAppConfirmation',
    initialState,
    reducers: {
        openAppConfirmationRequested(
            state,
            {
                payload: { requestId, name, source },
            }: PayloadAction<{
                requestId: string;
                name: string;
                source: SourceName;
            }>,
        ) {
            state.requestId = requestId;
            state.name = name;
            state.source = source;
        },
        openAppConfirmationAnswered(state) {
            state.requestId = undefined;
        },
    },
});

export default slice.reducer;

export const { openAppConfirmationRequested, openAppConfirmationAnswered } =
    slice.actions;

export const getOpenAppConfirmationRequest = (state: RootState) => ({
    ...state.openAppConfirmation,
    isVisible: state.openAppConfirmation.requestId != null,
});
