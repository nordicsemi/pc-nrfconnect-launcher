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
import { notifyAuthStateChanged } from './helpers';
import { getActiveAccountInfo, registerSession } from './session';

const crypto = new CryptoProvider();

interface ActiveLogin {
    promise: Promise<GenericAuthResult<null>>;
    resolve: (result: GenericAuthResult<null>) => void;
    state: string;
    codeVerifier: string;
    timeoutId: NodeJS.Timeout;
    initiatingWindow: BrowserWindow | null;
    authUrl?: string;
}

let activeLogin: ActiveLogin | null = null;

const finishLogin = (state: string, result: GenericAuthResult<null>) => {
    if (!activeLogin || activeLogin.state !== state) return;
    clearTimeout(activeLogin.timeoutId);
    const { resolve } = activeLogin;
    activeLogin = null;
    resolve(result);

    getActiveAccountInfo().then(account =>
        notifyAuthStateChanged({
            status: account.status ? 'signedIn' : 'signedOut',
            account: account.status ? account.data : undefined,
        }),
    );
};

export const startOauthLogin = (): Promise<GenericAuthResult<null>> => {
    if (activeLogin) {
        activeLogin.initiatingWindow = BrowserWindow.getFocusedWindow();
        if (activeLogin.authUrl)
            shell.openExternal(activeLogin.authUrl).catch(() => {});

        return activeLogin.promise;
    }

    notifyAuthStateChanged({ status: 'signingIn' });

    const state = crypto.createNewGuid();

    let resolveFn!: (result: GenericAuthResult<null>) => void;
    const promise = new Promise<GenericAuthResult<null>>(resolve => {
        resolveFn = resolve;
    });

    const timeoutId = setTimeout(
        () => finishLogin(state, { status: false, error: 'Login timed out' }),
        OAUTH_CONFIG.LOGIN_TIMEOUT_MS,
    );

    activeLogin = {
        promise,
        resolve: resolveFn,
        state,
        codeVerifier: '',
        timeoutId,
        initiatingWindow: BrowserWindow.getFocusedWindow(),
    };

    (async () => {
        try {
            const { verifier, challenge } = await crypto.generatePkceCodes();
            const nonce = crypto.createNewGuid();

            if (!activeLogin || activeLogin.state !== state) return;
            activeLogin.codeVerifier = verifier;

            const url = await getPca().getAuthCodeUrl({
                scopes: OAUTH_CONFIG.DEFAULT_SCOPES,
                redirectUri: OAUTH_CONFIG.REDIRECT_URI,
                codeChallenge: challenge,
                codeChallengeMethod: 'S256',
                state,
                nonce,
                prompt: OAUTH_CONFIG.PROMPT,
                responseMode: ResponseMode.QUERY,
                extraQueryParameters: {
                    source: OAUTH_CONFIG.SOURCE,
                    response_type: OAUTH_CONFIG.RESPONSE_TYPE,
                },
            });

            const entraAuthUrl = new URL(url);
            const myNordicUrl = new URL(OAUTH_CONFIG.MYNORDIC_AUTH_ENTRY_URL);

            entraAuthUrl.searchParams.forEach((value, key) => {
                myNordicUrl.searchParams.set(key, value);
            });
            activeLogin.authUrl = OAUTH_CONFIG.USE_MYNORDIC_FLOW
                ? myNordicUrl.toString()
                : entraAuthUrl.toString();

            await shell.openExternal(activeLogin.authUrl);
        } catch (err) {
            finishLogin(state, {
                status: false,
                error: `Could not start login: ${err}`,
            });
        }
    })();

    return promise;
};

// Called from deep link handler when the auth provider redirects back with the code (or error).
export const completeOauthLogin = async (
    callbackUrl: string,
): Promise<void> => {
    const params = new URL(callbackUrl).searchParams;
    const state = params.get('state');
    if (!state) return;

    // Непознат/stale state -> не е нашият активен login (или е settle-нат) -> игнор.
    if (!activeLogin || activeLogin.state !== state) return;

    const { initiatingWindow, codeVerifier } = activeLogin;

    const code = params.get('code');
    const errorParam = params.get('error_description') ?? params.get('error');

    if (errorParam || !code) {
        finishLogin(state, {
            status: false,
            error: errorParam ?? 'No authorization code',
        });
        return;
    }

    try {
        const tokenResult = await getPca().acquireTokenByCode({
            code,
            scopes: OAUTH_CONFIG.DEFAULT_SCOPES,
            redirectUri: OAUTH_CONFIG.REDIRECT_URI,
            codeVerifier,
        });
        await registerSession(tokenResult);

        if (initiatingWindow && !initiatingWindow.isDestroyed()) {
            focusWindow(initiatingWindow);
        }

        finishLogin(state, { status: true, data: null });
    } catch (err) {
        finishLogin(state, { status: false, error: String(err) });
    }
};
