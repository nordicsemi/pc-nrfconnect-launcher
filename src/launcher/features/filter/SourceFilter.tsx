/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { capitalize } from 'lodash';

import { allStandardSourceNames } from '../../../common/sources';
import { useLauncherDispatch, useLauncherSelector } from '../../util/hooks';
import Col from '../layout/Col';
import { getExternalSourcesSorted } from '../sources/sourcesSlice';
import CheckboxFilterEntry, {
    NewCheckboxFilterEntry,
} from './CheckboxFilterEntry';
import FilterDropdownHeading from './FilterDropdownHeading';
import { getHiddenSources, hideSource, showSource } from './filterSlice';

export default () => {
    const dispatch = useLauncherDispatch();

    const externalSourceNames = useLauncherSelector(
        getExternalSourcesSorted,
    ).map(({ name }) => name);
    const allSourceNames = [...allStandardSourceNames, ...externalSourceNames];

    const hiddenSources = useLauncherSelector(getHiddenSources);

    return (
        <Col className="tw-pl-6 tw-pr-0">
            <FilterDropdownHeading label="Sources" />
            {allSourceNames.map((sourceName, i) => {
                const isShown = !hiddenSources.has(sourceName);

                return (
                    <NewCheckboxFilterEntry
                        label={
                            allStandardSourceNames.includes(sourceName)
                                ? capitalize(sourceName)
                                : sourceName
                        }
                        key={`cb-${i + 1}`}
                        checked={isShown}
                        onChange={() => {
                            if (isShown) {
                                dispatch(hideSource(sourceName));
                            } else {
                                dispatch(showSource(sourceName));
                            }
                        }}
                    />
                );
            })}
        </Col>
    );
};
