/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

const sharedConfig =
    require('@nordicsemiconductor/pc-nrfconnect-shared/config/jest.config')([
        'serialport',
    ]);

sharedConfig.setupFilesAfterEnv.push('<rootDir>/src/test/setupMocks.js');
sharedConfig.transformIgnorePatterns = [
    'node_modules/(?!(@nordicsemiconductor/pc-nrfconnect-shared|move-file)/)',
];

module.exports = sharedConfig;
