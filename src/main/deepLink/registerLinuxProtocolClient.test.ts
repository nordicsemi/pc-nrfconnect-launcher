/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { execFile } from 'child_process';
import { copyFileSync, mkdirSync, writeFileSync } from 'fs';

import { registerLinuxAppImageProtocolClient } from './registerLinuxProtocolClient';

jest.mock('fs');
jest.mock('child_process', () => ({
    execFile: jest.fn(
        (
            _command: string,
            _args: string[],
            callback: (error: Error | null) => void,
        ) => callback(null),
    ),
}));
jest.mock('../icons', () => ({
    getNrfConnectForDesktopIcon: () => '/app/resources/icon.png',
}));

describe('registerLinuxAppImageProtocolClient', () => {
    const mockedCopyFileSync = jest.mocked(copyFileSync);
    const mockedMkdirSync = jest.mocked(mkdirSync);
    const mockedWriteFileSync = jest.mocked(writeFileSync);
    const mockedExecFile = jest.mocked(execFile) as unknown as jest.Mock;

    const succeedRunningCommands = () => {
        mockedExecFile.mockImplementation(
            (
                _command: string,
                _args: string[],
                callback: (error: Error | null) => void,
            ) => callback(null),
        );
    };

    beforeEach(() => {
        jest.resetAllMocks();
        succeedRunningCommands();
        process.env.XDG_DATA_HOME = '/home/test/.local/share';
        process.env.APPIMAGE = '/home/test/Applications/nrfconnect.AppImage';
    });

    afterEach(() => {
        delete process.env.XDG_DATA_HOME;
        delete process.env.APPIMAGE;
    });

    it('registers the deep link scheme', async () => {
        await registerLinuxAppImageProtocolClient('nrfconnectfordesktop');

        expect(mockedMkdirSync).toBeCalledWith(
            '/home/test/.local/share/applications',
            { recursive: true },
        );
        expect(mockedExecFile).toBeCalledWith(
            'xdg-mime',
            [
                'default',
                'nrfconnect-deeplink.desktop',
                'x-scheme-handler/nrfconnectfordesktop',
            ],
            expect.any(Function),
        );
    });

    it('writes a desktop entry that points to a persistent icon', async () => {
        await registerLinuxAppImageProtocolClient('nrfconnectfordesktop');

        expect(mockedCopyFileSync).toBeCalledWith(
            '/app/resources/icon.png',
            '/home/test/.local/share/nrfconnect/nrfconnect.png',
        );
        expect(mockedWriteFileSync).toBeCalledWith(
            '/home/test/.local/share/applications/nrfconnect-deeplink.desktop',
            expect.stringContaining(
                'Icon=/home/test/.local/share/nrfconnect/nrfconnect.png',
            ),
        );
    });

    it('keeps working if copying the icon fails', async () => {
        mockedCopyFileSync.mockImplementation(() => {
            throw new Error('permission denied');
        });

        await registerLinuxAppImageProtocolClient('nrfconnectfordesktop');

        expect(mockedWriteFileSync).toBeCalledWith(
            '/home/test/.local/share/applications/nrfconnect-deeplink.desktop',
            expect.stringContaining('Icon=/app/resources/icon.png'),
        );
    });

    it('does nothing when not running from an AppImage', async () => {
        delete process.env.APPIMAGE;

        await registerLinuxAppImageProtocolClient('nrfconnectfordesktop');

        expect(mockedWriteFileSync).not.toBeCalled();
    });
});
