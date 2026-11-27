/*
 * Copyright (c) 2023 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    describeError,
    ErrorDialogActions,
    telemetry,
} from '@nordicsemiconductor/pc-nrfconnect-shared';
import { getHasUserAgreedToTelemetry } from '@nordicsemiconductor/pc-nrfconnect-shared/src/utils/persistentStore';

import cleanIpcErrorMessage from '../../../common/cleanIpcErrorMessage';
import { getDoNotRemindOnMissingToken } from '../../../common/persistedStore';
import { isDeprecatedSource } from '../../../common/sources';
import { inMain } from '../../../ipc/apps';
import { inMain as artifactoryToken } from '../../../ipc/artifactoryToken';
import { inMain as sources } from '../../../ipc/sources';
import type { AppThunk } from '../../store';
import { handleAppsWithErrors } from '../apps/appsEffects';
import {
    addDownloadableApps,
    downloadableAppsLoaded,
    setAllLocalApps,
} from '../apps/appsSlice';
import { checkForJLinkUpdate } from '../jlinkUpdate/jlinkUpdateEffects';
import {
    getArtifactoryTokenInformation,
    getShouldCheckForUpdatesAtStartup,
    setArtifactoryTokenInformation,
} from '../settings/settingsSlice';
import { handleSourcesWithErrors } from '../sources/sourcesEffects';
import {
    getDoNotRemindDeprecatedSources,
    getSources,
    getSourcesWithRestrictedAccessLevel,
    setSources,
    showDeprecatedSources,
    warnAboutMissingTokenOnStartup,
} from '../sources/sourcesSlice';
import { sendEnvInfo } from '../telemetry/telemetryEffects';
import {
    setIsSendingTelemetry,
    showTelemetryDialog,
} from '../telemetry/telemetrySlice';
import {
    INTERRUPT_PROCESS,
    type ProcessStep,
    runRemainingProcessStepsSequentially,
} from './thunkProcess';
import { startUpdateProcess } from './updateProcess';

const checkTelemetrySetting: ProcessStep = dispatch => {
    if (getHasUserAgreedToTelemetry() == null) {
        dispatch(showTelemetryDialog());
        return INTERRUPT_PROCESS;
    }

    dispatch(setIsSendingTelemetry(telemetry.getIsSendingTelemetry()));
};

const loadSources: ProcessStep = async dispatch => {
    try {
        dispatch(setSources(await sources.getSources()));
    } catch (error) {
        dispatch(
            ErrorDialogActions.showDialog(
                `Unable to load settings: ${describeError(error)}`,
            ),
        );
    }
};

export const loadApps: ProcessStep = async dispatch => {
    try {
        dispatch(setAllLocalApps(await inMain.getLocalApps()));

        const { apps, appsWithErrors, sourcesWithErrors } =
            await inMain.getDownloadableApps();

        dispatch(addDownloadableApps(apps));
        dispatch(handleAppsWithErrors(appsWithErrors));
        dispatch(handleSourcesWithErrors(sourcesWithErrors));
    } catch (error) {
        dispatch(ErrorDialogActions.showDialog(describeError(error)));
    } finally {
        dispatch(downloadableAppsLoaded());
    }
};

const loadTokenInformation: ProcessStep = async (dispatch, getState) => {
    const shouldCheckForUpdatesAtStartup =
        getShouldCheckForUpdatesAtStartup(getState());
    if (!shouldCheckForUpdatesAtStartup) return;

    try {
        const informationResult = await artifactoryToken.getTokenInformation();

        if (informationResult.type === 'Success')
            dispatch(
                setArtifactoryTokenInformation(informationResult.information),
            );

        if (informationResult.type === 'Encryption not available') {
            dispatch(
                ErrorDialogActions.showDialog(
                    'nRF Connect for Desktop needs permission to access your Keychain. ' +
                        "Without this permission, restricted sources won't be updated, " +
                        'and attempts to install apps from them will fail.' +
                        '\n\n' +
                        'To change this, you need to restart nRF Connect for Desktop ' +
                        'and on start allow access to your Keychain.',
                ),
            );
        }
    } catch (error) {
        dispatch(
            ErrorDialogActions.showDialog(
                `Your identity token could not be validated. If you are online, it may have expired.`,
                undefined,
                cleanIpcErrorMessage(describeError(error)),
            ),
        );
    }
};

const checkForDeprecatedSources: ProcessStep = (dispatch, getState) => {
    const deprecatedSources = getSources(getState()).filter(isDeprecatedSource);

    if (
        !(
            deprecatedSources.length === 0 ||
            getDoNotRemindDeprecatedSources(getState())
        )
    ) {
        dispatch(showDeprecatedSources(deprecatedSources));
        return INTERRUPT_PROCESS;
    }
};

const checkForMissingToken: ProcessStep = (dispatch, getState) => {
    if (getDoNotRemindOnMissingToken()) return;

    const token = getArtifactoryTokenInformation(getState());
    const sourcesWithRestrictedAccessLevel =
        getSourcesWithRestrictedAccessLevel(getState());

    if (token == null && sourcesWithRestrictedAccessLevel.length > 0) {
        dispatch(
            warnAboutMissingTokenOnStartup(sourcesWithRestrictedAccessLevel),
        );
        return INTERRUPT_PROCESS;
    }
};

let currentProcessSteps: ProcessStep[] = [];

export const startLauncherInitialisation =
    (): AppThunk => (dispatch, getState) => {
        currentProcessSteps = [
            checkTelemetrySetting,
            loadSources,
            loadApps,
            loadTokenInformation,
            checkForDeprecatedSources,
            checkForMissingToken,
            sendEnvInfo,
            getShouldCheckForUpdatesAtStartup(getState())
                ? startUpdateProcess(false)
                : checkForJLinkUpdate({ checkOnline: false }),
        ];

        dispatch(continueLauncherInitialisation());
    };

export const continueLauncherInitialisation = (): AppThunk => dispatch => {
    dispatch(runRemainingProcessStepsSequentially(currentProcessSteps));
};
