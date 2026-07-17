/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { PublicClientApplication } from '@azure/msal-node';

import { cachePlugin } from './storage';

export const OAUTH_CONFIG = {
    CLIENT_ID: '15ebbfd3-f0ee-466c-bcfd-ff46b810ee81',
    TENANT_ID: 'c03b7be1-b92c-44ad-bb72-ffa36ef5b0bb',
    HOST: 'nordicsemiextdev.ciamlogin.com',
    REDIRECT_URI: `nrfconnectfordesktop://my-nordic/auth/callback`,
    DEFAULT_SCOPES: [
        'openid',
        'profile',
        'email',
        'offline_access',
        'User.Read',
    ],
    SOURCE: 'nrfconnectfordesktop',
    RESPONSE_TYPE: 'code',
    PROMPT: 'login',
    DOMAIN_HINT: 'nordicsemiextdev.onmicrosoft.com',
    REALM: 'nordicsemiextdev.ciamlogin.com',
    LOGIN_TIMEOUT_MS: 5 * 60 * 1000, // TODO: Adjust as needed. 5 min.
    MYNORDIC_AUTH_ENTRY_URL:
        'https://mynordic-nordicsemi-env-dev-pixel-perfect.vercel.app/en/sign-up/create-account ',
};

let pca: PublicClientApplication | undefined;

export const getPca = () => {
    if (!pca) {
        pca = new PublicClientApplication({
            auth: {
                clientId: OAUTH_CONFIG.CLIENT_ID,
                authority: `https://${OAUTH_CONFIG.HOST}/${OAUTH_CONFIG.TENANT_ID}`,
            },
            cache: { cachePlugin },
        });
    }
    return pca;
};
