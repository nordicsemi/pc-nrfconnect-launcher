/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { CryptoProvider, ResponseMode } from '@azure/msal-node';
import type { GenericAuthResult } from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';
import { BrowserWindow, shell } from 'electron';

import { focusWindow } from '../windows';
import { getPca, OAUTH_CONFIG } from './config';

const crypto = new CryptoProvider();

const toSnakeCaseParams = (
    params: Record<string, string>,
): Record<string, string> =>
    Object.fromEntries(
        Object.entries(params).map(([key, value]) => [
            key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`),
            value,
        ]),
    );

interface PendingLogin {
    resolve: (result: GenericAuthResult<null>) => void;
    codeVerifier: string;
    timeoutId: NodeJS.Timeout;
    initiatingWindow: BrowserWindow | null;
}

// Map of pending logins, keyed by a unique state value. This allows handling multiple concurrent login attempts.
const pendingLogins = new Map<string, PendingLogin>();

export const startOauthLogin = async (): Promise<GenericAuthResult<null>> => {
    const pca = getPca();
    const initiatingWindow = BrowserWindow.getFocusedWindow();
    const { verifier, challenge } = await crypto.generatePkceCodes();
    const state = crypto.createNewGuid();
    const nonce = crypto.createNewGuid();

    const url = await pca.getAuthCodeUrl({
        scopes: OAUTH_CONFIG.DEFAULT_SCOPES,
        redirectUri: OAUTH_CONFIG.REDIRECT_URI,
        codeChallenge: challenge,
        codeChallengeMethod: 'S256',
        state,
        nonce,
        prompt: OAUTH_CONFIG.PROMPT,
        responseMode: ResponseMode.QUERY,
        // domainHint: OAUTH_CONFIG.DOMAIN_HINT,
        extraQueryParameters: toSnakeCaseParams({
            source: OAUTH_CONFIG.SOURCE,
            responseType: OAUTH_CONFIG.RESPONSE_TYPE,
            // realm: OAUTH_CONFIG.REALM,
        }),
    });

    const entraAuthUrl = new URL(url);
    const myNordicUrl = new URL(OAUTH_CONFIG.MYNORDIC_AUTH_ENTRY_URL);

    entraAuthUrl.searchParams.forEach((value, key) => {
        myNordicUrl.searchParams.set(key, value);
    });

    return new Promise<GenericAuthResult<null>>(resolve => {
        const timeoutId = setTimeout(() => {
            pendingLogins.delete(state);
            resolve({ status: false, error: 'Login timed out' });
        }, OAUTH_CONFIG.LOGIN_TIMEOUT_MS);

        pendingLogins.set(state, {
            resolve,
            codeVerifier: verifier,
            timeoutId,
            initiatingWindow,
        });

        shell.openExternal(myNordicUrl.toString()).catch(err => {
            clearTimeout(timeoutId);
            pendingLogins.delete(state);
            resolve({ status: false, error: `Could not open browser: ${err}` });
        });
    });
};

// Called from deep link handler when the auth provider redirects back with the code (or error).
export const completeOauthLogin = async (
    callbackUrl: string,
): Promise<void> => {
    const params = new URL(callbackUrl).searchParams;
    const state = params.get('state');
    if (!state) return;

    const pending = pendingLogins.get(state); // Unknown state -> not one of our pending logins, or already handled (e.g. timeout), (CSRF) -> ignore
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingLogins.delete(state);

    if (pending.initiatingWindow) focusWindow(pending.initiatingWindow);

    const code = params.get('code');
    const errorParam = params.get('error_description') ?? params.get('error');

    if (errorParam || !code) {
        pending.resolve({
            status: false,
            error: errorParam ?? 'No authorization code',
        });
        return;
    }

    try {
        const pca = getPca();
        await pca.acquireTokenByCode({
            code,
            scopes: OAUTH_CONFIG.DEFAULT_SCOPES,
            redirectUri: OAUTH_CONFIG.REDIRECT_URI,
            codeVerifier: pending.codeVerifier,
        });
        // MSAL handles token caching internally, so we don't need to do anything with the result here. If it succeeds, we consider the login successful.
        pending.resolve({ status: true, data: null });
    } catch (err) {
        pending.resolve({ status: false, error: String(err) });
    }
};
