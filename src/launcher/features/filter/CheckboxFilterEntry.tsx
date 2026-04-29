/*
 * Copyright (c) 2025 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import Form from 'react-bootstrap/Form';

const CheckboxFilterEntry: React.FC<{
    label: string;
    checked: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}> = ({ label, checked, onChange }) => (
    <Form.Check
        label={label}
        id={`cb-${label.toLowerCase()}`}
        className="tw-mx-4 tw-px-6 tw-py-1"
        checked={checked}
        onChange={onChange}
    />
);

export default CheckboxFilterEntry;
