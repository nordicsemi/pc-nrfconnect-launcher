/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import type { PayloadAction } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import { mean } from 'lodash';

import {
    getLastUpdateCheckDate,
    setLastUpdateCheckDate,
} from '../../../common/persistedStore';
import { OFFICIAL, type SourceName } from '../../../common/sources';
import { type Progress as AppInstallProgress } from '../../../ipc/appInstallProgress';
import {
    type App,
    type AppSpec,
    type DownloadableApp,
    type InstalledDownloadableApp,
    isDownloadable,
    isInstalled,
    isQuickStartApp,
    isUpdatable,
    isWithdrawn,
    type LocalApp,
} from '../../../ipc/apps';
import type { RootState } from '../../store';
import { getAppsFilter } from '../filter/filterSlice';

type AppProgress = {
    isInstalling: boolean;
    isUpdating: boolean;
    isRemoving: boolean;
    fractions: { [fractionName: string]: number };
};

const notInProgress = (): AppProgress => ({
    isInstalling: false,
    isUpdating: false,
    isRemoving: false,
    fractions: {},
});

const appNotInProgress = <X>(app: X) => ({
    ...app,
    progress: notInProgress(),
});

type DownloadableAppWithProgress = DownloadableApp & {
    progress: AppProgress;
};

export type DisplayedApp = LocalApp | DownloadableAppWithProgress;

export type State = {
    localApps: LocalApp[];
    downloadableApps: DownloadableAppWithProgress[];
    lastUpdateCheckDate?: Date;
    isDownloadingLatestAppInfo: boolean;
    haveDownloadableAppsLoaded: boolean;
};

const initialState: State = {
    localApps: [],
    downloadableApps: [],
    lastUpdateCheckDate: getLastUpdateCheckDate(),
    isDownloadingLatestAppInfo: false,
    haveDownloadableAppsLoaded: false,
};

const equalsSpec = (specOfSoughtApp: AppSpec) => (app: App) =>
    app.source === specOfSoughtApp.source && app.name === specOfSoughtApp.name;

const notEqualsSpec = (specOfSoughtApp: AppSpec) => (app: App) =>
    !equalsSpec(specOfSoughtApp)(app);

const addApp = (apps: DownloadableAppWithProgress[], app: DownloadableApp) => {
    apps.push(appNotInProgress(app));
};

const overwriteApp = (
    apps: DownloadableAppWithProgress[],
    app: DownloadableApp,
) => {
    const existingAppIndex = apps.findIndex(equalsSpec(app));
    apps[existingAppIndex] = {
        ...app,
        progress: apps[existingAppIndex].progress,
    };
};

const updateApp = <AppType extends App>(
    specOfAppToUpdate: AppSpec,
    apps: AppType[],
    update: (app: AppType) => void,
) => {
    const appToUpdate = apps.find(equalsSpec(specOfAppToUpdate));

    if (appToUpdate != null) {
        update(appToUpdate);
    } else {
        console.error(
            `No app ${appToUpdate} found in the existing downloadable apps though there is supposed to be one.`,
        );
    }
};

const resetProgress = (
    specOfAppToUpdate: AppSpec,
    apps: DownloadableAppWithProgress[],
) => {
    updateApp(specOfAppToUpdate, apps, app => {
        app.progress = notInProgress();
    });
};

const slice = createSlice({
    name: 'apps',
    initialState,
    reducers: {
        // Local apps
        setAllLocalApps(
            state,
            { payload: localApps }: PayloadAction<LocalApp[]>,
        ) {
            state.localApps = [...localApps];
        },

        addLocalApp(state, { payload: newApp }: PayloadAction<LocalApp>) {
            state.localApps.push(newApp);
        },

        removeLocalApp(state, { payload: appName }: PayloadAction<string>) {
            state.localApps = state.localApps.filter(
                app => app.name !== appName,
            );
        },

        // Downloadable apps
        downloadableAppsLoaded(state) {
            state.haveDownloadableAppsLoaded = true;
        },
        addDownloadableApps(
            state,
            { payload: apps }: PayloadAction<DownloadableApp[]>,
        ) {
            apps.forEach(app => {
                const appIsKnown = state.downloadableApps.some(equalsSpec(app));

                if (appIsKnown) {
                    overwriteApp(state.downloadableApps, app);
                } else {
                    addApp(state.downloadableApps, app);
                }
            });
        },

        removeAppsOfSource(
            state,
            { payload: sourceName }: PayloadAction<SourceName>,
        ) {
            state.downloadableApps = state.downloadableApps.filter(
                app => app.source !== sourceName,
            );
        },

        // Update downloadable app infos
        updateDownloadableAppInfosStarted(state) {
            state.isDownloadingLatestAppInfo = true;
        },

        updateDownloadableAppInfosSuccess: {
            reducer(state, { payload: updateCheckDate }: PayloadAction<Date>) {
                state.isDownloadingLatestAppInfo = false;
                state.lastUpdateCheckDate = updateCheckDate;
                setLastUpdateCheckDate(updateCheckDate);
            },
            prepare(updateCheckDate: Date = new Date()) {
                return { payload: updateCheckDate };
            },
        },
        updateDownloadableAppInfosFailed(state) {
            state.isDownloadingLatestAppInfo = false;
        },

        // App install progress
        initialiseAppInstallProgress(
            state,
            {
                payload: { app: appSpec, fractionNames },
            }: PayloadAction<{ app: AppSpec; fractionNames: string[] }>,
        ) {
            updateApp(appSpec, state.downloadableApps, app => {
                app.progress.fractions = Object.fromEntries(
                    fractionNames.map(fractionName => [fractionName, 0]),
                );
            });
        },

        updateAppInstallProgress(
            state,
            { payload: progress }: PayloadAction<AppInstallProgress>,
        ) {
            updateApp(progress.app, state.downloadableApps, app => {
                app.progress.fractions[progress.fractionName] =
                    progress.progressFraction;
            });
        },

        resetAppInstallProgress(
            state,
            { payload: app }: PayloadAction<AppSpec>,
        ) {
            resetProgress(app, state.downloadableApps);
        },

        // Install downloadable app
        installDownloadableAppStarted(
            state,
            { payload: appToInstall }: PayloadAction<AppSpec>,
        ) {
            updateApp(appToInstall, state.downloadableApps, app => {
                app.progress.isInstalling = true;
            });
        },

        // Update downloadable app
        updateDownloadableAppStarted(
            state,
            { payload: appToUpdate }: PayloadAction<AppSpec>,
        ) {
            updateApp(appToUpdate, state.downloadableApps, app => {
                app.progress.isUpdating = true;
            });
        },

        // Remove downloadable app
        removeDownloadableAppStarted(
            state,
            { payload: appToRemove }: PayloadAction<AppSpec>,
        ) {
            updateApp(appToRemove, state.downloadableApps, app => {
                app.progress.isRemoving = true;
            });
        },
        removeDownloadableAppSuccess(
            state,
            { payload: removedApp }: PayloadAction<AppSpec>,
        ) {
            const appToBeRemoved = state.downloadableApps.find(
                equalsSpec(removedApp),
            );
            if (appToBeRemoved != null && isWithdrawn(appToBeRemoved)) {
                state.downloadableApps = state.downloadableApps.filter(
                    notEqualsSpec(removedApp),
                );
            } else {
                resetProgress(removedApp, state.downloadableApps);

                updateApp(removedApp, state.downloadableApps, (app: object) => {
                    if ('currentVersion' in app) {
                        delete app.currentVersion;
                    }
                    if ('installed' in app) {
                        delete app.installed;
                    }
                });
            }
        },
    },
});

export default slice.reducer;

export const {
    addDownloadableApps,
    addLocalApp,
    downloadableAppsLoaded,
    initialiseAppInstallProgress,
    installDownloadableAppStarted,
    removeAppsOfSource,
    removeDownloadableAppStarted,
    removeDownloadableAppSuccess,
    removeLocalApp,
    resetAppInstallProgress,
    setAllLocalApps,
    updateAppInstallProgress,
    updateDownloadableAppInfosFailed,
    updateDownloadableAppInfosStarted,
    updateDownloadableAppInfosSuccess,
    updateDownloadableAppStarted,
} = slice.actions;

export const getAllApps = (state: RootState): DisplayedApp[] => {
    const { downloadableApps, localApps } = state.apps;

    return [...localApps, ...downloadableApps];
};

export const getNoAppsExist = (state: RootState) =>
    state.apps.localApps.length === 0 &&
    state.apps.downloadableApps.length === 0;

export const getHaveDownloadableAppsLoaded = (state: RootState) =>
    state.apps.haveDownloadableAppsLoaded;

export const getDownloadableApp =
    ({ source, name }: { name?: string; source?: SourceName }) =>
    (state: RootState) =>
        state.apps.downloadableApps.find(
            x => x.source === source && x.name === name,
        );

export const isAppUpdateAvailable = (state: RootState) =>
    state.apps.downloadableApps.some(isUpdatable);

export const getUpdateCheckStatus = (state: RootState) => ({
    isCheckingForUpdates: state.apps.isDownloadingLatestAppInfo,
    lastUpdateCheckDate: state.apps.lastUpdateCheckDate,
});

export const getUpdatableVisibleApps = (state: RootState) =>
    state.apps.downloadableApps
        .filter(getAppsFilter(state))
        .filter(isUpdatable);

export const isInProgress = (
    app: DisplayedApp,
): app is DownloadableAppWithProgress =>
    isDownloadable(app) &&
    (app.progress.isInstalling ||
        app.progress.isUpdating ||
        app.progress.isRemoving);

export const totalProgress = (app: DownloadableAppWithProgress) => {
    const fractions = Object.values(app.progress.fractions);
    return fractions.length === 0 ? 0 : mean(fractions);
};

export const getOfficialQuickStartApp = (state: RootState) =>
    state.apps.downloadableApps
        .filter(app => app.source === OFFICIAL)
        .filter(isQuickStartApp)
        .filter(isInstalled)[0] as InstalledDownloadableApp | undefined;
