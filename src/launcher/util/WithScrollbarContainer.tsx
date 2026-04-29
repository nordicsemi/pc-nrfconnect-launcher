/*
 * Copyright (c) 2021 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { classNames } from '@nordicsemiconductor/pc-nrfconnect-shared';

interface WithScrollbarContainerProps extends Pick<
    React.ComponentPropsWithRef<'div'>,
    'ref' | 'className'
> {
    hasFilter?: boolean;
}

const WithScrollbarContainer: React.FC<
    React.PropsWithChildren<WithScrollbarContainerProps>
> = ({ children, hasFilter = false, ...attrs }) => (
    <div
        className={classNames(
            'with-scrollbar',
            hasFilter && 'filter-adjusted-height',
        )}
        {...attrs}
    >
        <div className="content-container">{children}</div>
    </div>
);

export default WithScrollbarContainer;
