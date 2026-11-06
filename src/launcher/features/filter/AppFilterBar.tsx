/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useRef, useState } from 'react';
import Dropdown from 'react-bootstrap/Dropdown';
import { Button } from '@nordicsemiconductor/pc-nrfconnect-shared';

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

const FilterDropdown1 = () => {
    const [active, setActive] = useState(false);

    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!active) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setActive(false);
        };

        const handleClickOutside = (event: MouseEvent) => {
            if (
                wrapperRef.current &&
                !wrapperRef.current.contains(event.target as Node)
            ) {
                setActive(false);
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [active]);

    return (
        <div className="tw-relative" ref={wrapperRef}>
            <Button
                variant="secondary"
                size="lg"
                onClick={() => setActive(!active)}
            >
                <span className="mdi mdi-tune" />
                Filter
            </Button>
            {active && (
                <div className="tw-absolute tw-mt-0.5 tw-flex tw-flex-col tw-overflow-hidden tw-border tw-border-solid tw-border-gray-300 tw-bg-white tw-py-2">
                    <Row className="tw-ml-0 tw-flex-nowrap">
                        <SourceFilter />
                        <StateFilter />
                    </Row>
                </div>
            )}
        </div>
    );
};

export default () => (
    <div className="filterbox tw-inline-flex tw-w-full">
        <FilterDropdown1 />
        <NameFilter />
        <div className="tw-flex-auto" />
        <UpdateAllApps />
    </div>
);
