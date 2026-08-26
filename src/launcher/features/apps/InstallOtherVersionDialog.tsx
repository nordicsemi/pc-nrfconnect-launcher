/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
    ConfirmationDialog,
    Dropdown,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { rsort } from 'semver';

import { type DownloadableApp, isQuickStartApp } from '../../../ipc/apps';
import { useLauncherDispatch, useLauncherSelector } from '../../util/hooks';
import {
    getInstallOtherVersionDialog,
    hideInstallOtherVersionDialog,
} from './appDialogsSlice';
import { installDownloadableApp } from './appsEffects';

import styles from './installOtherVersionDialog.module.scss';

const VersionList = ({
    app,
    id,
    setVersionToInstall,
    versionToInstall,
}: {
    app?: DownloadableApp;
    id: string;
    setVersionToInstall: (version: string) => void;
    versionToInstall?: string;
}) => {
    const availableVersions = useMemo(
        () =>
            rsort(Object.keys(app?.versions ?? {})).map(v => ({
                label: v,
                value: v,
            })),
        [app],
    );

    const selectedVersionToInstall =
        availableVersions.find(item => item.value === versionToInstall) ??
        availableVersions[0];

    return (
        <Dropdown
            id={id}
            onSelect={({ value }) => setVersionToInstall(value)}
            selectedItem={selectedVersionToInstall}
            items={availableVersions}
            numItemsBeforeScroll={8}
        />
    );
};

export default () => {
    const dispatch = useLauncherDispatch();
    const installOtherVersionDialog = useLauncherSelector(
        getInstallOtherVersionDialog,
    );
    const [versionToInstall, setVersionToInstall] = useState<string>();
    useEffect(() => {
        if (versionToInstall == null && installOtherVersionDialog.isVisible) {
            setVersionToInstall(installOtherVersionDialog.app.latestVersion);
        }
    }, [versionToInstall, installOtherVersionDialog]);

    const appName = installOtherVersionDialog.isVisible
        ? installOtherVersionDialog.app.displayName
        : '';

    return (
        <ConfirmationDialog
            isVisible={installOtherVersionDialog.isVisible}
            title="Install other version"
            confirmLabel="Install"
            cancelLabel="Cancel"
            onConfirm={() => {
                if (!installOtherVersionDialog.isVisible) {
                    throw new Error(
                        'Should be impossible to invoke a disabled button',
                    );
                }

                dispatch(
                    installDownloadableApp(
                        installOtherVersionDialog.app,
                        versionToInstall,
                    ),
                );
                dispatch(hideInstallOtherVersionDialog());
                setVersionToInstall(undefined);
            }}
            onCancel={() => {
                dispatch(hideInstallOtherVersionDialog());
                setVersionToInstall(undefined);
            }}
        >
            <p>
                You can install an older version of {appName}, but{' '}
                {installOtherVersionDialog.isVisible &&
                    'autoUpdate' in installOtherVersionDialog.app &&
                    (installOtherVersionDialog.app.autoUpdate ||
                        isQuickStartApp(installOtherVersionDialog.app)) && // TODO remove isQuickStartApp once we stop forcing QS to be auto-updatable
                    'this turns off the autoupdate feature of this app and'}{' '}
                only the latest version is supported by Nordic Semiconductor.
            </p>

            <form className={styles.versionListLine}>
                {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- versionList is the id for a control */}
                <label htmlFor="versionList">Version to install:</label>
                <div>
                    <VersionList
                        id="versionList"
                        app={
                            installOtherVersionDialog.isVisible
                                ? installOtherVersionDialog.app
                                : undefined
                        }
                        versionToInstall={versionToInstall}
                        setVersionToInstall={setVersionToInstall}
                    />
                </div>
            </form>
        </ConfirmationDialog>
    );
};
