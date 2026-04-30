/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { createDisposableTempDir } from '@nordicsemiconductor/pc-nrfconnect-shared/main';
import { dialog } from 'electron';
import fs from 'fs';
import { moveFile } from 'move-file';
import path from 'path';
import shasum from 'shasum';

import { inRenderer as appInstallProgress } from '../../ipc/appInstallProgress';
import {
    appExists,
    type AppSpec,
    type DownloadableApp,
    failureReadingFile,
    type InstallResult,
    successfulInstall,
} from '../../ipc/apps';
import { getAppsLocalDir, getAppsRootDir } from '../config';
import { deleteFile, listFiles, untar } from '../fileUtil';
import { mkdir } from '../mkdir';
import { downloadFractionName, downloadToFile } from '../net';
import {
    assertPreparedNrfutilModules,
    sandboxFractionNames,
} from '../nrfutilModules';
import {
    addDownloadAppData,
    addInstalledAppData,
    getLocalApp,
    installedAppPath,
    isInstalled,
    localApp,
    readAppInfo,
    readAppInfoFile,
    writeAppInfo,
} from './app';
import { getSource } from './sources/sources';

const extractNpmPackage = async (
    appName: string,
    tgzFile: string,
    destinationDir: string,
) => {
    using tempDir = createDisposableTempDir();
    const appDir = path.join(tempDir.path, appName);

    await untar(tgzFile, appDir, 1);
    await moveFile(appDir, destinationDir);
};

/*
 * Get the app name from the given *.tgz archive file. Expects the
 * file name to be on the form "{name}-{version}.tgz".
 */
export const getNameFromNpmPackage = (tgzFile: string) => {
    const fileName = path.basename(tgzFile);
    const lastDash = fileName.lastIndexOf('-');
    if (lastDash > 0) {
        return fileName.substring(0, lastDash);
    }
    return null;
};

export const installLocalApp = async (
    tgzFilePath: string,
): Promise<InstallResult> => {
    // Determine app name and path
    const appName = getNameFromNpmPackage(tgzFilePath);
    if (!appName) {
        return failureReadingFile(
            `Unable to get app name from archive: \`${tgzFilePath}\`. ` +
                `Expected file name format: \`{name}-{version}.tgz.\``,
        );
    }
    const appPath = installedAppPath(localApp(appName));

    // Check if app exists
    if (fs.existsSync(appPath)) {
        return appExists(appName, appPath);
    }

    // Extract app package
    mkdir(appPath);
    try {
        await extractNpmPackage(appName, tgzFilePath, appPath);
    } catch (error) {
        fs.rmSync(appPath, { recursive: true, force: true });
        return failureReadingFile(
            `Unable to extract app archive \`${tgzFilePath}\`.`,
            error,
        );
    }

    const app = getLocalApp(appName);

    if (app.name !== appName) {
        fs.rmSync(appPath, { recursive: true, force: true });
        return failureReadingFile(
            `According to the filename \`${tgzFilePath}\`, the app should ` +
                `be called \`${appName}\`, but internally it is called ` +
                `\`${app.name}\`.`,
        );
    }

    return successfulInstall(app);
};

export const removeLocalApp = (appName: string) =>
    fs.rmSync(installedAppPath(localApp(appName)), {
        recursive: true,
        force: true,
    });

const deleteFileOnSuccess = (result: InstallResult, tgzFilePath: string) => {
    if (result.type === 'success') {
        deleteFile(tgzFilePath);
    }
};

const showErrorOnUnreadableFile = (result: InstallResult) => {
    if (
        result.type === 'failure' &&
        result.errorType === 'error reading file'
    ) {
        dialog.showErrorBox('Failed to install local app', result.errorMessage);
    }
};

const shouldRemoveExistingApp = (tgzFilePath: string, appPath: string) => {
    const clickedButton = dialog.showMessageBoxSync({
        type: 'question',
        title: 'Existing app directory',
        message:
            `Tried to extract archive ${tgzFilePath}, ` +
            `but app directory ${appPath} already exists.\n\n` +
            'Do you want to remove existing app in order to extract the archive?',
        buttons: ['Remove', 'Cancel'],
    });

    return clickedButton === 0;
};

const confirmOverwritingOnExistingApp = async (
    result: InstallResult,
    tgzFilePath: string,
) => {
    if (
        result.type === 'failure' &&
        result.errorType === 'error because app exists' &&
        shouldRemoveExistingApp(tgzFilePath, result.appPath)
    ) {
        fs.rmSync(result.appPath, { recursive: true, force: true });
        const resultOfRetry = await installLocalApp(tgzFilePath);

        if (resultOfRetry.type === 'success') {
            deleteFile(tgzFilePath);
        }
    }
};

export const installAllLocalAppArchives = () => {
    const tgzFiles = listFiles(getAppsLocalDir(), /\.tgz$/);
    return tgzFiles.reduce(
        (prev, tgzFile) =>
            prev.then(async () => {
                const tgzFilePath = path.join(getAppsLocalDir(), tgzFile);

                const result = await installLocalApp(tgzFilePath);

                deleteFileOnSuccess(result, tgzFilePath);
                await confirmOverwritingOnExistingApp(result, tgzFilePath);
                showErrorOnUnreadableFile(result);
            }),
        Promise.resolve<unknown>(undefined),
    );
};

const removeInstallMetaData = (app: AppSpec) => {
    const appInfo = readAppInfo(app);
    delete appInfo.installed;

    writeAppInfo(
        appInfo,
        getSource(app.source)!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
    );
};

export const removeDownloadableApp = async (app: AppSpec) => {
    const appPath = installedAppPath(app);
    if (!appPath.includes('node_modules')) {
        throw new Error(
            'Sanity check failed when trying ' +
                `to remove app directory ${appPath}. The directory does not ` +
                'have node_modules in its path.',
        );
    }

    removeInstallMetaData(app);

    using tempDir = createDisposableTempDir();
    await moveFile(appPath, path.join(tempDir.path, 'to-be-deleted'));
};

const verifyShasum = (filePath: string, expectedShasum?: string) => {
    let buffer: Buffer;
    try {
        buffer = fs.readFileSync(filePath);
    } catch {
        throw new Error(
            `Unable to read file when verifying shasum: ${filePath}`,
        );
    }

    const computedShasum = shasum(buffer);
    if (expectedShasum != null && expectedShasum !== computedShasum) {
        throw new Error(
            `Shasum verification failed for ${filePath}. Expected ` +
                `'${expectedShasum}', but got '${computedShasum}'.`,
        );
    }
};

const download = async (app: AppSpec, version?: string) => {
    const appInfo = readAppInfoFile(app);
    const versionToInstall = appInfo.versions[version ?? appInfo.latestVersion];

    if (versionToInstall == null) {
        return Promise.reject(
            new Error(`No tarball found for ${app.name}@${version}`),
        );
    }

    const tarballUrl = versionToInstall.tarballUrl;

    const fileName = path.basename(tarballUrl);
    const packageFilePath = path.join(getAppsRootDir(app.source), fileName);

    appInstallProgress.reportAppInstallStart(app, [
        downloadFractionName,
        ...sandboxFractionNames(versionToInstall.nrfutilModules),
    ]);

    await Promise.all([
        downloadToFile(tarballUrl, packageFilePath, { app }),
        ...assertPreparedNrfutilModules(
            app,
            versionToInstall.nrfutilModules,
            versionToInstall.nrfutilCore,
        ),
    ]);
    verifyShasum(packageFilePath, versionToInstall.shasum);

    return {
        packageFilePath,
        checksum: versionToInstall.shasum,
        publishTimestamp: versionToInstall.publishTimestamp,
    };
};

const addInstallMetaData = (
    app: AppSpec,
    appPath: string,
    checksum?: string,
    publishTimestamp?: string,
) => {
    writeAppInfo(
        {
            ...readAppInfo(app),
            installed: { path: appPath, shasum: checksum, publishTimestamp },
        },
        getSource(app.source)!, // eslint-disable-line @typescript-eslint/no-non-null-assertion
    );
};

export const installDownloadableApp = async (
    app: DownloadableApp,
    version?: string,
) => {
    const { packageFilePath, checksum, publishTimestamp } = await download(
        app,
        version,
    );

    if (isInstalled(app)) {
        await removeDownloadableApp(app);
    }

    await installDownloadableAppCore(
        app,
        packageFilePath,
        checksum,
        publishTimestamp,
    );

    const installedApp = addInstalledAppData(
        // @ts-expect-error -- Because the property `installed` was added above it must be there, I just do not know yet how to convince TypeScript of that
        addDownloadAppData(app.source)(readAppInfo(app)),
    );

    appInstallProgress.reportAppInstallSuccess(installedApp);

    return installedApp;
};

export const installDownloadableAppCore = async (
    app: AppSpec,
    packageFilePath: string,
    checksum: string | undefined,
    publishTimestamp?: string,
    doDelete = true,
) => {
    const appPath = installedAppPath(app);
    await extractNpmPackage(app.name, packageFilePath, appPath);
    if (doDelete) {
        deleteFile(packageFilePath);
    }

    addInstallMetaData(app, appPath, checksum, publishTimestamp);
};
