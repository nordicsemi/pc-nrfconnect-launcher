/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import {
    type AuthenticationResult,
    InteractionRequiredAuthError,
} from '@azure/msal-node';
import {
    type AccountInfo,
    type GenericAuthResult,
    type ProfileInfo,
} from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';
import { shell } from 'electron';

import { clearMsalCache } from '../../common/persistedStore';
import { logger } from '../log';
import { getPca, OAUTH_CONFIG } from './config';
import { notifyAuthStateChanged } from './helpers';

export const registerSession = async (
    authResult: AuthenticationResult,
): Promise<void> => {
    const claims = authResult.idTokenClaims as {
        sid?: string;
        oid?: string;
    };

    const res = await fetch(
        `${OAUTH_CONFIG.SLO_BASE_URL}/auth/sessions/register`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authResult.accessToken}`,
                'Ocp-Apim-Subscription-Key': OAUTH_CONFIG.APIM_SUBSCRIPTION_KEY,
            },
            body: JSON.stringify({
                sid: claims.sid,
                oid: claims.oid,
                source: OAUTH_CONFIG.SOURCE,
            }),
        },
    );

    if (!res.ok) {
        logger.warn(
            `Session register failed: ${res.status}, errorId=${res.headers.get(
                'x-error-id',
            )}`,
        );
        console.warn(
            `Session register failed: ${res.status}, errorId=${res.headers.get(
                'x-error-id',
            )}, body=${await res.text()}`,
        );
        return;
    }

    console.warn('Session registered successfully');
};

export const getActiveAccountInfo = async (): Promise<
    GenericAuthResult<AccountInfo>
> => {
    const accounts = await getPca().getTokenCache().getAllAccounts();
    const account = accounts[0];

    return account
        ? {
              status: true,
              data: {
                  username: account.username,
                  name: account.name,
              },
          }
        : { status: false, error: 'No account found.' };
};

export const getProfileInfo = async (): Promise<
    GenericAuthResult<ProfileInfo>
> => {
    const token = await getAccessTokenSilently();

    if (!token.status) {
        return { status: false, error: token.error };
    }

    const res = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: { Authorization: `Bearer ${token.data}` },
    });
    const profile = await res.json();

    return { status: true, data: profile };
};

const acquireToken = async (
    scopes?: string[],
): Promise<GenericAuthResult<AuthenticationResult>> => {
    const pca = getPca();
    const account = (await pca.getTokenCache().getAllAccounts())[0];
    if (!account) return { status: false, error: 'No account found.' };

    try {
        const result = await pca.acquireTokenSilent({
            account,
            scopes: scopes ?? OAUTH_CONFIG.DEFAULT_SCOPES,
            forceRefresh: false,
        });
        return { status: true, data: result };
    } catch (err) {
        if (err instanceof InteractionRequiredAuthError) {
            // refresh token failed, likely due to expired refresh token or revoked permissions.
            // await localLogout(); // Clear cache to ensure next login is clean and UI status.
            return { status: false, error: 'Interaction required.' };
        }
        throw err; // Unexpected error (e.g. network issue, temporary service issue) -> propagate.
    }
};

export const getAccessTokenSilently = async (
    scopes?: string[],
): Promise<GenericAuthResult<string>> => {
    const result = await acquireToken(scopes);
    return result.status
        ? { status: true, data: result.data.accessToken }
        : result;
};

export const getIdTokenSilently = async (
    scopes?: string[],
): Promise<GenericAuthResult<string>> => {
    const result = await acquireToken(scopes);
    return result.status ? { status: true, data: result.data.idToken } : result;
};

export const validateSession = async (): Promise<
    GenericAuthResult<'validated' | 'invalidated' | 'invalid'>
> => {
    const result = await acquireToken();
    if (!result.status) return { status: false, error: result.error };

    try {
        const res = await fetch(
            `${OAUTH_CONFIG.SLO_BASE_URL}/extauth/session`,
            {
                headers: {
                    Authorization: `Bearer ${result.data.accessToken}`,
                    'Ocp-Apim-Subscription-Key':
                        OAUTH_CONFIG.APIM_SUBSCRIPTION_KEY,
                },
            },
        );
        const header = res.headers.get('x-session-status');
        if (res.status === 200 && header === 'validated')
            return { status: true, data: 'validated' };
        if (res.status === 401 || header === 'invalidated') {
            await localLogout(); // If the server session is invalidated somewhere else
            return { status: true, data: 'invalidated' };
        }
        return { status: true, data: 'invalid' };
    } catch {
        // inconclusive due to network error or temporary service issue, do not log out the user
        return { status: false, error: 'Session check inconclusive' };
    }
};

export const localLogout = async (): Promise<GenericAuthResult<null>> => {
    const cache = getPca().getTokenCache();
    const accounts = await cache.getAllAccounts();
    await Promise.all(accounts.map(account => cache.removeAccount(account)));
    clearMsalCache();
    return { status: true, data: null };
};

export const singleSignOut = async (): Promise<GenericAuthResult<null>> => {
    try {
        notifyAuthStateChanged({ status: 'signingOut' });
        // 1. Acquire token to get the sid and id_token_hint
        const result = await acquireToken();
        if (!result.status) return { status: false, error: result.error };
        const { accessToken, idTokenClaims } = result.data;
        const sid = (idTokenClaims as { sid?: string }).sid;

        // 2. Revoke server-side session first
        console.warn('Single sign-out: revoking server-side session...');
        await fetch(`${OAUTH_CONFIG.SLO_BASE_URL}/auth/sessions/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
                'Ocp-Apim-Subscription-Key': OAUTH_CONFIG.APIM_SUBSCRIPTION_KEY,
            },
            body: JSON.stringify({ sid }), // { signedOut: true }
        });

        // 3. Now clear local MSAL cache
        console.warn('Single sign-out: clearing local MSAL cache...');
        await localLogout();
        notifyAuthStateChanged({ status: 'signedOut' });

        // 4. Redirect to Entra to clear the SSO cookie as well
        const logoutUrl =
            `https://${OAUTH_CONFIG.HOST}/${OAUTH_CONFIG.TENANT_ID}/oauth2/v2.0/logout` +
            `?post_logout_redirect_uri=${encodeURIComponent(OAUTH_CONFIG.POST_LOGOUT_URI)}` +
            `&id_token_hint=${result.data.idToken}`;
        console.warn(
            'Single sign-out: opening browser to logout URL:',
            logoutUrl,
        );
        await shell.openExternal(logoutUrl);

        return { status: true, data: null };
    } catch (err) {
        console.error('Single sign-out failed:', err);
        return {
            status: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
};
