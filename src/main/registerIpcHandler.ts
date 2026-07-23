/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import * as auth from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';
import {
    appDetails,
    launcherConfig,
    open,
    preventSleep,
    safeStorage,
    serialPort,
} from '@nordicsemiconductor/pc-nrfconnect-shared/main';
import {
    app,
    powerSaveBlocker,
    safeStorage as safeStorageElectron,
} from 'electron';
import Store from 'electron-store';
import fs from 'fs';
import path from 'path';

import packageJson from '../../package.json';
import * as apps from '../ipc/apps';
import * as artifactoryToken from '../ipc/artifactoryToken';
import * as desktopShortcut from '../ipc/createDesktopShortcut';
import * as jlink from '../ipc/jlink';
import * as launcherUpdate from '../ipc/launcherUpdate';
import * as openAppConfirmation from '../ipc/openAppConfirmation';
import * as proxyLogin from '../ipc/proxyLogin';
import * as sources from '../ipc/sources';
import {
    installDownloadableApp,
    installLocalApp,
    removeDownloadableApp,
    removeLocalApp,
} from './apps/appChanges';
import {
    checkForAppsUpdate,
    downloadLatestAppInfos,
    getDownloadableApps,
    getLocalApps,
} from './apps/apps';
import createDesktopShortcut from './apps/createDesktopShortcut';
import { addSource, removeSource } from './apps/sources/sourceChanges';
import { getAllSources } from './apps/sources/sources';
import { getTokenInformation, removeToken, setToken } from './artifactoryToken';
import { answerOpenAppConfirmation } from './deepLink/openAppConfirmation';
import { getJLinkState, installJLink } from './jlink';
import {
    cancelUpdate,
    checkForUpdate,
    setUseChineseUpdateServer,
    startUpdate,
} from './launcherUpdate';
import { startOauthLogin } from './oauth/login';
import {
    getAccessTokenSilently,
    getActiveAccountInfo,
    getIdTokenSilently,
    getProfileInfo,
    localLogout,
} from './oauth/session';
import { openFile, openFileLocation, openUrl } from './open';
import { callRegisteredCallback } from './proxyLogins';
import {
    closeSerialPort,
    getOptions,
    isOpen,
    openOrAdd,
    set,
    update,
    writeToSerialport,
} from './serialport';
import { getAppDetails, openApp, openLauncherWindow } from './windows';

const getConfigForRenderer = () => ({
    isRunningLauncherFromSource: fs.existsSync(
        path.join(app.getAppPath(), 'README.md'),
    ),
    launcherVersion: packageJson.version,
    userDataDir: app.getPath('userData'),
});

const startPreventingSleep = () =>
    powerSaveBlocker.start('prevent-app-suspension');
const endPreventingSleep = (id: number) => powerSaveBlocker.stop(id);

export default () => {
    Store.initRenderer();

    artifactoryToken.forRenderer.registerGetTokenInformation(
        getTokenInformation,
    );
    artifactoryToken.forRenderer.registerSetToken(setToken);
    artifactoryToken.forRenderer.registerRemoveToken(removeToken);

    appDetails.forRenderer.registerGetAppDetails(getAppDetails);

    launcherConfig.forRenderer.registerGetConfig(getConfigForRenderer());

    desktopShortcut.forRenderer.registerCreateDesktopShortcut(
        createDesktopShortcut,
    );

    preventSleep.forRenderer.registerStart(startPreventingSleep);
    preventSleep.forRenderer.registerEnd(endPreventingSleep);

    safeStorage.forRenderer.registerEncryptionAvailable(
        safeStorageElectron.isEncryptionAvailable,
    );
    safeStorage.forRenderer.registerDecryptString(
        safeStorageElectron.decryptString,
    );
    safeStorage.forRenderer.registerEncryptString(
        safeStorageElectron.encryptString,
    );

    proxyLogin.forRenderer.registerAnswerProxyLoginRequest(
        callRegisteredCallback,
    );

    openAppConfirmation.forRenderer.registerAnswerOpenAppConfirmation(
        answerOpenAppConfirmation,
    );

    launcherUpdate.forRenderer.registerCheckForUpdate(checkForUpdate);
    launcherUpdate.forRenderer.registerStartUpdate(startUpdate);
    launcherUpdate.forRenderer.registerCancelUpdate(cancelUpdate);
    launcherUpdate.forRenderer.registerSetUseChineseUpdateServer(
        setUseChineseUpdateServer,
    );

    open.forRenderer.registerOpenApp(openApp);
    open.forRenderer.registerOpenLauncher(openLauncherWindow);
    open.forRenderer.registerOpenFile(openFile);
    open.forRenderer.registerOpenFileLocation(openFileLocation);
    open.forRenderer.registerOpenUrl(openUrl);

    apps.forRenderer.registerDownloadLatestAppInfos(downloadLatestAppInfos);
    apps.forRenderer.registerCheckForAppsUpdate(checkForAppsUpdate);
    apps.forRenderer.registerGetLocalApps(getLocalApps);
    apps.forRenderer.registerInstallLocalApp(installLocalApp);
    apps.forRenderer.registerRemoveLocalApp(removeLocalApp);
    apps.forRenderer.registerRemoveDownloadableApp(removeDownloadableApp);
    apps.forRenderer.registerGetDownloadableApps(getDownloadableApps);
    apps.forRenderer.registerInstallDownloadableApp(installDownloadableApp);

    sources.forRenderer.registerGetSources(getAllSources);
    sources.forRenderer.registerAddSource(addSource);
    sources.forRenderer.registerRemoveSource(removeSource);

    serialPort.forRenderer.registerOpen(openOrAdd);
    serialPort.forRenderer.registerClose(closeSerialPort);
    serialPort.forRenderer.registerWrite(writeToSerialport);
    serialPort.forRenderer.registerIsOpen(isOpen);
    serialPort.forRenderer.registerGetOptions(getOptions);
    serialPort.forRenderer.registerUpdate(update);
    serialPort.forRenderer.registerSet(set);

    jlink.forRenderer.registerGetJLinkState(getJLinkState);
    jlink.forRenderer.registerInstallJLink(installJLink);

    auth.forRenderer.registerStartLogin(startOauthLogin);
    auth.forRenderer.registerLocalLogout(localLogout);
    auth.forRenderer.registerGetIdToken(getIdTokenSilently);
    auth.forRenderer.registerGetAccessToken(getAccessTokenSilently);
    auth.forRenderer.registerGetAccountInfo(getActiveAccountInfo);
    auth.forRenderer.registerGetProfileInfo(getProfileInfo);
};
