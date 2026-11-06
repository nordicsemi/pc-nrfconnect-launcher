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
        custom
        checked={checked}
        onChange={onChange}
    />
);

export default CheckboxFilterEntry;

const NewCheckboxFilterEntry: React.FC<{
    label: string;
    checked: boolean;
    onChange: React.ChangeEventHandler<HTMLInputElement>;
}> = ({ label, checked, onChange }) => (
    <div className="tw-mx-4 tw-flex tw-items-center tw-gap-2 tw-py-1 tw-pr-6">
        <input
            type="checkbox"
            id={`cb-${label.toLowerCase()}`}
            className="tw-m-0 tw-h-4 tw-w-4 tw-shrink-0 checked:tw-accent-nordicBlue-700"
            checked={checked}
            onChange={onChange}
        />
        <label htmlFor={`cb-${label.toLowerCase()}`} className="tw-m-0">
            {label}
        </label>
    </div>
);

export { NewCheckboxFilterEntry };
