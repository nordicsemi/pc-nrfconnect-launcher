/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';

import { createDownloadableTestApp } from '../../../test/testFixtures';
import render from '../../../test/testrenderer';
import {
    addDownloadableApps,
    updateDownloadableAppInfosStarted,
    updateDownloadableAppInfosSuccess,
} from '../apps/appsSlice';
import Settings from './Settings';
import {
    setArtifactoryTokenInformation,
    setCheckForUpdatesAtStartup,
    showUpdateCheckComplete,
} from './settingsSlice';

// Do not render react-bootstrap components in tests
jest.mock('react-bootstrap', () => ({
    Modal: 'Modal',
    Button: 'Button',
    ModalHeader: 'ModalHeader',
    ModalFooter: 'ModalFooter',
    ModalBody: 'ModalBody',
    ModalTitle: 'ModalTitle',
}));

jest.mock('@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth', () => ({
    inMain: {
        getAccountInfo: jest
            .fn()
            .mockResolvedValue({ status: false, error: 'No account found.' }),
        startLogin: jest.fn(),
        singleSignOut: jest
            .fn()
            .mockResolvedValue({ status: true, data: null }),
        registerOnStateChanged: jest.fn(),
    },
}));

describe('SettingsView', () => {
    it('should render with check for updates enabled', () => {
        expect(
            render(<Settings />, [setCheckForUpdatesAtStartup(true)])
                .baseElement,
        ).toMatchSnapshot();
    });

    it('should render with check for updates disabled', () => {
        expect(
            render(<Settings />, [setCheckForUpdatesAtStartup(false)])
                .baseElement,
        ).toMatchSnapshot();
    });

    it('should render when checking for updates', () => {
        expect(
            render(<Settings />, [updateDownloadableAppInfosStarted()])
                .baseElement,
        ).toMatchSnapshot();
    });

    it('should render with last update check date', () => {
        expect(
            render(<Settings />, [
                updateDownloadableAppInfosSuccess(
                    new Date(2017, 1, 3, 13, 41, 36),
                ),
            ]).baseElement,
        ).toMatchSnapshot();
    });

    it('should render check for updates completed, with updates available', () => {
        expect(
            render(<Settings />, [
                showUpdateCheckComplete(),
                addDownloadableApps([
                    createDownloadableTestApp(undefined, {
                        currentVersion: '1.0.0',
                        latestVersion: '1.2.3',
                    }),
                ]),
            ]).baseElement,
        ).toMatchSnapshot();
    });

    it('should render check for updates completed, with everything up to date', () => {
        expect(
            render(<Settings />, [
                showUpdateCheckComplete(),
                addDownloadableApps([createDownloadableTestApp()]),
            ]).baseElement,
        ).toMatchSnapshot();
    });

    it('should render the token information', () => {
        expect(
            render(<Settings />, [
                setArtifactoryTokenInformation({
                    description: 'a token',
                    expiry: 100,
                    token_id: 'an_id',
                }),
            ]).baseElement,
        ).toMatchSnapshot();
    });
});
