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
    type AuthState,
    type GenericAuthResult,
    type ProfileInfo,
} from '@nordicsemiconductor/pc-nrfconnect-shared/ipc/auth';
import { shell } from 'electron';

import { clearMsalCache } from '../../common/persistedStore';
import { logger } from '../log';
import { getPca, OAUTH_CONFIG } from './config';
import { getLastAuthState, notifyAuthStateChanged } from './helpers';

export const registerSession = async (
    authResult: AuthenticationResult,
): Promise<void> => {
    const claims = authResult.idTokenClaims as { sid?: string; oid?: string };

    const res = await fetch(
        `${OAUTH_CONFIG.SLO_BASE_URL}/auth/sessions/register`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${authResult.accessToken}`,
            },
            body: JSON.stringify({
                sid: claims.sid,
                oid: claims.oid,
                source: OAUTH_CONFIG.SOURCE,
            }),
        },
    );

    if (!res.ok)
        logger.warn(
            `Session register failed: ${res.status}, errorId=${res.headers.get(
                'x-error-id',
            )}`,
        );
};

export const getAuthStatus = async (): Promise<AuthState> => {
    const last = getLastAuthState();
    if (last) return last;

    const account = await getActiveAccountInfo();
    if (!account.status) return { status: 'signedOut' };

    const token = await acquireToken();
    return token.status
        ? { status: 'signedIn', account: account.data }
        : { status: 'interactionRequired', account: account.data };
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
            // Refresh token failed, likely due to expired refresh token or revoked permissions.
            // The user needs to re-authenticate to get a new refresh token.
            notifyAuthStateChanged({ status: 'interactionRequired', account });
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

const removeLocalSessions = async (): Promise<GenericAuthResult<null>> => {
    const cache = getPca().getTokenCache();
    const accounts = await cache.getAllAccounts();
    await Promise.all(accounts.map(account => cache.removeAccount(account)));
    clearMsalCache();
    notifyAuthStateChanged({ status: 'signedOut' });
    return { status: true, data: null };
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
                },
            },
        );
        const header = res.headers.get('x-session-status');
        if (res.status === 200 && header === 'validated')
            return { status: true, data: 'validated' };
        if (res.status === 401 || header === 'invalidated') {
            await removeLocalSessions(); // If the server session is invalidated somewhere else
            return { status: true, data: 'invalidated' };
        }
        await removeLocalSessions();
        return { status: true, data: 'invalid' };
    } catch {
        // inconclusive due to network error or temporary service issue, do not log out the user
        return { status: false, error: 'Session check inconclusive' };
    }
};

export const singleSignOut = async (): Promise<GenericAuthResult<null>> => {
    try {
        const account = await getActiveAccountInfo();
        notifyAuthStateChanged({
            status: 'signingOut',
            account: account.status ? account.data : undefined,
        });

        // 1. Acquire token to get the sid and id_token_hint
        const result = await acquireToken();
        if (!result.status) {
            // No valid token. We can't revoke server-side session or hit Entra, but we should still complete the local logout.
            await removeLocalSessions();
            return { status: true, data: null };
        }
        const { accessToken, idTokenClaims } = result.data;
        const claims = idTokenClaims as { sid?: string; login_hint?: string };
        const loginHint = claims.login_hint;
        const sid = claims.sid;

        // 2. Revoke server-side session first
        await fetch(`${OAUTH_CONFIG.SLO_BASE_URL}/auth/sessions/logout`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ sid }),
        });

        // 3. Clear local MSAL cache
        await removeLocalSessions();

        // 4. Redirect to Entra to clear the SSO cookie as well
        let logoutUrl =
            `https://${OAUTH_CONFIG.HOST}/${OAUTH_CONFIG.TENANT_ID}/oauth2/v2.0/logout` +
            `?post_logout_redirect_uri=${encodeURIComponent(OAUTH_CONFIG.REDIRECT_URI)}` +
            `&id_token_hint=${result.data.idToken}`;

        if (loginHint)
            logoutUrl += `&logout_hint=${encodeURIComponent(loginHint)}`;

        await shell.openExternal(logoutUrl);

        return { status: true, data: null };
    } catch (err) {
        notifyAuthStateChanged({ status: 'signedOut' });
        return {
            status: false,
            error: err instanceof Error ? err.message : String(err),
        };
    }
};
