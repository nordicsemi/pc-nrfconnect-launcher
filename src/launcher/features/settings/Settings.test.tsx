/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React from 'react';
import { screen } from '@testing-library/react';

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
        getAuthStatus: jest.fn().mockResolvedValue({ status: 'signedOut' }),
        registerOnStateChanged: jest.fn(),
        startLogin: jest.fn(),
        singleSignOut: jest
            .fn()
            .mockResolvedValue({ status: true, data: null }),
    },
}));

describe('SettingsView', () => {
    it('should render with check for updates enabled', async () => {
        const { baseElement } = render(<Settings />, [
            setCheckForUpdatesAtStartup(true),
        ]);
        await screen.findByText('My Nordic account');
        expect(baseElement).toMatchSnapshot();
    });

    it('should render with check for updates disabled', async () => {
        const { baseElement } = render(<Settings />, [
            setCheckForUpdatesAtStartup(false),
        ]);
        await screen.findByText('My Nordic account');
        expect(baseElement).toMatchSnapshot();
    });

    it('should render when checking for updates', async () => {
        const { baseElement } = render(<Settings />, [
            updateDownloadableAppInfosStarted(),
        ]);
        await screen.findByText('My Nordic account');
        expect(baseElement).toMatchSnapshot();
    });

    it('should render with last update check date', async () => {
        const { baseElement } = render(<Settings />, [
            updateDownloadableAppInfosSuccess(new Date(2017, 1, 3, 13, 41, 36)),
        ]);
        await screen.findByText('My Nordic account');
        expect(baseElement).toMatchSnapshot();
    });

    it('should render check for updates completed, with updates available', async () => {
        const { baseElement } = render(<Settings />, [
            showUpdateCheckComplete(),
            addDownloadableApps([
                createDownloadableTestApp(undefined, {
                    currentVersion: '1.0.0',
                    latestVersion: '1.2.3',
                }),
            ]),
        ]);
        await screen.findByText('My Nordic account');
        expect(baseElement).toMatchSnapshot();
    });

    it('should render check for updates completed, with everything up to date', async () => {
        const { baseElement } = render(<Settings />, [
            showUpdateCheckComplete(),
            addDownloadableApps([createDownloadableTestApp()]),
        ]);
        await screen.findByText('My Nordic account');
        expect(baseElement).toMatchSnapshot();
    });

    it('should render the token information', async () => {
        const { baseElement } = render(<Settings />, [
            setArtifactoryTokenInformation({
                description: 'a token',
                expiry: 100,
                token_id: 'an_id',
            }),
        ]);
        await screen.findByText('My Nordic account');
        expect(baseElement).toMatchSnapshot();
    });
});
