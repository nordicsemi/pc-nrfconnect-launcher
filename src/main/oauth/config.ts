/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { PublicClientApplication } from '@azure/msal-node';

import { cachePlugin } from './storage';

export const OAUTH_CONFIG = {
    CLIENT_ID: '5b42d3f5-9af2-4d64-9cb1-00f85bf27da8',
    TENANT_ID: '1fb18d84-2f00-4d3e-a795-e45655386b44',
    HOST: 'nordicsemiextprod.ciamlogin.com',
    REDIRECT_URI: `nrfconnectfordesktop://my-nordic/auth/callback`,
    DEFAULT_SCOPES: [
        'openid',
        'profile',
        'email',
        'offline_access',
        'https://graph.microsoft.com/User.Read',
    ],
    SOURCE: 'nrfconnectfordesktop',
    RESPONSE_TYPE: 'code',
    PROMPT: 'login',
    LOGIN_TIMEOUT_MS: 10 * 60 * 1000,
    MYNORDIC_AUTH_ENTRY_URL:
        'https://mynordic.nordicsemi.com/en/sign-up/create-account',
    SLO_BASE_URL: 'https://apim-mynordic-prod.azure-api.net/slo/api/v2',
    APIM_SUBSCRIPTION_KEY: 'ee0296bb78ff45d78eb4f6619bb5d4d4',
    USE_MYNORDIC_FLOW: true, // Default = true. Set to false to use the Entra flow directly, instead of the MyNordic flow.
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
