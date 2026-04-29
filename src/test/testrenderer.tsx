/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { Provider, type ProviderProps } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import { type Action } from 'redux';

import { reducer } from '../launcher/store';

type Store = ReturnType<typeof preparedStore>;

export const preparedStore = (actions: Action[] = []) => {
    const store = configureStore({
        reducer,
        middleware: getDefaultMiddleware =>
            getDefaultMiddleware({ serializableCheck: false }),
    });
    actions.forEach(store.dispatch);

    return store;
};

const preparedProvider =
    (store: Store) => (props: Omit<ProviderProps, 'store'>) => (
        <Provider store={store} {...props} />
    );

export default (
    element: React.ReactElement,
    actionsOrStore?: Action[] | Store,
) => {
    const store =
        actionsOrStore === undefined || Array.isArray(actionsOrStore)
            ? preparedStore(actionsOrStore)
            : actionsOrStore;

    return render(element, { wrapper: preparedProvider(store) });
};
