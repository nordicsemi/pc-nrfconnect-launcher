/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useRef } from 'react';
import { useHotKey } from '@nordicsemiconductor/pc-nrfconnect-shared';

import { useLauncherDispatch, useLauncherSelector } from '../../util/hooks';
import { getNameFilter, setNameFilter } from './filterSlice';

export default () => {
    const dispatch = useLauncherDispatch();
    const filter = useLauncherSelector(getNameFilter);
    const searchFieldRef = useRef<HTMLInputElement>(null);

    useHotKey({
        hotKey: ['mod+e', 'mod+f', 'mod+l'],
        title: 'Focus search field',
        isGlobal: false,
        action: () => searchFieldRef.current?.focus(),
    });

    return (
        <input
            type="text"
            placeholder="Search..."
            className="tw-preflight tw-rounded-none tw-border tw-border-solid tw-border-white tw-bg-white tw-px-3 tw-py-1 tw-text-base tw-leading-none tw-text-gray-700 placeholder:tw-text-gray-600 focus:tw-outline-none focus:tw-ring-[0.2rem] focus:tw-ring-nordicBlue/25"
            value={filter}
            ref={searchFieldRef}
            onChange={event => {
                const nameFilter = event.target.value;
                dispatch(setNameFilter(nameFilter));
            }}
            onFocus={() => searchFieldRef.current?.select()}
        />
    );
};
