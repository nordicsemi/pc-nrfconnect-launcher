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

import { clearMsalCache } from '../../common/persistedStore';
import { getPca, OAUTH_CONFIG } from './config';

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

export const localLogout = async (): Promise<GenericAuthResult<null>> => {
    const cache = getPca().getTokenCache();
    const accounts = await cache.getAllAccounts();
    await Promise.all(accounts.map(account => cache.removeAccount(account)));
    clearMsalCache();
    return { status: true, data: null };
};
