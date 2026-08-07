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

interface ActiveSignIn {
    resultPromise: Promise<GenericAuthResult<null>>;
    reportResult: (result: GenericAuthResult<null>) => void;
    oauthState: string;
    pkceCodeVerifier: string;
    finishLoginTimeoutId: NodeJS.Timeout;
    initiatingWindow: BrowserWindow | null;
    authUrl?: string;
    redeemingCode?: boolean;
}

let activeSignIn: ActiveSignIn | null = null;

const finishSignIn = (state: string, result: GenericAuthResult<null>) => {
    if (!activeSignIn || activeSignIn.oauthState !== state) return;
    clearTimeout(activeSignIn.finishLoginTimeoutId);
    const { reportResult } = activeSignIn;
    activeSignIn = null;
    reportResult(result);

    getActiveAccountInfo().then(account =>
        notifyAuthStateChanged({
            status: account.status ? 'signedIn' : 'signedOut',
            account: account.status ? account.data : undefined,
        }),
    );
};

export const startOauthSignIn = (): Promise<GenericAuthResult<null>> => {
    if (activeSignIn) {
        activeSignIn.initiatingWindow = BrowserWindow.getFocusedWindow();
        if (activeSignIn.authUrl)
            shell.openExternal(activeSignIn.authUrl).catch(() => {});

        return activeSignIn.resultPromise;
    }

    notifyAuthStateChanged({ status: 'signingIn' });

    const state = crypto.createNewGuid();

    let reportResultFn!: (result: GenericAuthResult<null>) => void;
    const resultPromise = new Promise<GenericAuthResult<null>>(resolve => {
        reportResultFn = resolve;
    });

    const finishLoginTimeoutId = setTimeout(
        () =>
            finishSignIn(state, { status: false, error: 'Sign in timed out' }),
        OAUTH_CONFIG.SIGNIN_TIMEOUT_MS,
    );

    activeSignIn = {
        resultPromise,
        reportResult: reportResultFn,
        oauthState: state,
        pkceCodeVerifier: '',
        finishLoginTimeoutId,
        initiatingWindow: BrowserWindow.getFocusedWindow(),
    };

    (async () => {
        try {
            const { verifier, challenge } = await crypto.generatePkceCodes();
            const nonce = crypto.createNewGuid();

            if (!activeSignIn || activeSignIn.oauthState !== state) return;
            activeSignIn.pkceCodeVerifier = verifier;

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
            activeSignIn.authUrl = OAUTH_CONFIG.USE_MYNORDIC_FLOW
                ? myNordicUrl.toString()
                : entraAuthUrl.toString();

            await shell.openExternal(activeSignIn.authUrl);
        } catch (err) {
            finishSignIn(state, {
                status: false,
                error: `Could not start sign in: ${err}`,
            });
        }
    })();

    return resultPromise;
};

export const cancelOauthSignIn = (): GenericAuthResult<null> => {
    if (!activeSignIn)
        return { status: false, error: 'No sign-in in progress' };

    // Too late to cancel if the code is already being redeemed (otherwise we risk
    // "cancelled" UI, but a valid token in the cache).
    if (activeSignIn.redeemingCode)
        return { status: false, error: 'Sign-in is completing' };

    finishSignIn(activeSignIn.oauthState, {
        status: false,
        error: 'Sign-in cancelled',
    });
    return { status: true, data: null };
};

// Called from deep link handler when the auth provider redirects back with the code (or error).
export const completeOauthSignIn = async (
    callbackUrl: string,
): Promise<void> => {
    const params = new URL(callbackUrl).searchParams;
    const state = params.get('state');
    if (!state) return;

    // Unknown/stale state -> not our active sign in (or already settled) -> ignore.
    if (
        !activeSignIn ||
        activeSignIn.oauthState !== state ||
        activeSignIn.redeemingCode
    ) {
        return;
    }
    activeSignIn.redeemingCode = true;

    const { initiatingWindow, pkceCodeVerifier } = activeSignIn;

    const code = params.get('code');
    const errorParam = params.get('error_description') ?? params.get('error');

    if (errorParam || !code) {
        finishSignIn(state, {
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
            codeVerifier: pkceCodeVerifier,
        });
        await registerSession(tokenResult);

        if (initiatingWindow && !initiatingWindow.isDestroyed()) {
            focusWindow(initiatingWindow);
        }

        finishSignIn(state, { status: true, data: null });
    } catch (err) {
        finishSignIn(state, { status: false, error: String(err) });
    }
};
