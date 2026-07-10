/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { app } from 'electron';

import { logger } from '../log';
import { completeOauthLogin } from '../oauth/login';
import { handleOpenAppDeepLink } from './handlers/appsHandler';

export const DEEPLINK_SCHEME = 'nrfconnectfordesktop';

// Define deep link routes here. Each route has a match function and a handle function.
// The match function should return true if the URL matches the route, and the handle function should handle the URL.
const routes: { match: (u: URL) => boolean; handle: (u: URL) => unknown }[] = [
    {
        match: u => u.host === 'apps' && u.pathname.startsWith('/open/'),
        handle: handleOpenAppDeepLink,
    },
    {
        match: u => u.host === 'my-nordic' && u.pathname === '/auth/callback',
        handle: u => completeOauthLogin(u.toString()),
    },
];

const routeDeepLink = async (url: URL) => {
    const route = routes.find(r => r.match(url));
    if (!route)
        return logger.warn(
            `Unknown deep link route: ${url.host}${url.pathname}`,
        );
    await route.handle(url);
};

export const handleDeepLink = (rawUrl?: string) => {
    if (!rawUrl) return;

    let url: URL;
    try {
        url = new URL(rawUrl);
    } catch {
        logger.warn(`Invalid deep link URL: ${rawUrl}`);
        return;
    }

    app.whenReady().then(() =>
        routeDeepLink(url).catch(err =>
            logger.error(`Deep link handling failed: ${err}`),
        ),
    );
};

const findDeepLink = (args: string[]) =>
    args.find(a => a.startsWith(`${DEEPLINK_SCHEME}://`));

export const containsDeepLink = (args: string[]) => findDeepLink(args) != null;

export const handleDeepLinkFromArgv = (argv = process.argv) => {
    handleDeepLink(findDeepLink(argv));
};
