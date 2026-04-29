/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { classNames } from '@nordicsemiconductor/pc-nrfconnect-shared';

interface RowProps extends Pick<
    React.ComponentPropsWithRef<'div'>,
    'ref' | 'className'
> {
    noGutters?: boolean;
}

const Row: React.FC<React.PropsWithChildren<RowProps>> = ({
    children,
    className,
    noGutters,
}) => (
    <div
        className={classNames(
            noGutters || 'tw--mx-4',
            'tw-flex tw-flex-row tw-flex-wrap',
            className,
        )}
    >
        {children}
    </div>
);

export default Row;
