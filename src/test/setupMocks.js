/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

jest.mock('electron', () => ({
    ipcRenderer: {
        sendSync: channel =>
            channel === 'get-config'
                ? {
                      mocked: 'in tests',
                  }
                : 'Unknown channel used in tests',
    },
    app: {
        on: jest.fn(),
        getPath: () => 'mocked/path',
    },
}));

jest.mock('./../main/log.ts', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
    },
}));

jest.mock('move-file', () => ({ moveFile: jest.fn() }));

jest.mock('@electron/remote', () => ({
    require: jest.fn(),
    app: {
        getAppPath: () => process.cwd(),
    },
}));
