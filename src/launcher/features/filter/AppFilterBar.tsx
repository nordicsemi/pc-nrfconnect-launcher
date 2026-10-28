/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';

import Row from '../layout/Row';
import NameFilter from './NameFilter';
import SourceFilter from './SourceFilter';
import StateFilter from './StateFilter';
import UpdateAllApps from './UpdateAllApps';

const FilterDropdown = () => {
    const [active, setActive] = useState(false);

    return (
        <Dropdown onToggle={isOpen => setActive(isOpen)}>
            <Dropdown.Toggle variant="outline-secondary" active={active}>
                <span className="mdi mdi-tune" />
                Filter
            </Dropdown.Toggle>
            <Dropdown.Menu>
                <Row className="tw-ml-0 tw-flex-nowrap">
                    <SourceFilter />
                    <StateFilter />
                </Row>
            </Dropdown.Menu>
        </Dropdown>
    );
};

export default () => (
    <div className="filterbox tw-inline-flex tw-w-full tw-gap-3">
        <FilterDropdown />
        <NameFilter />
        <div className="tw-flex-auto" />
        <UpdateAllApps />
    </div>
);
