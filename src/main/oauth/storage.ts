/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

/* eslint-disable require-await */

import type { ICachePlugin, TokenCacheContext } from '@azure/msal-node';
import { safeStorage } from 'electron';

import {
    getEncryptedMsalCache,
    setEncryptedMsalCache,
} from '../../common/persistedStore';

export const cachePlugin: ICachePlugin = {
    // Called BEFORE any cache operation -> load from disk
    beforeCacheAccess: async (context: TokenCacheContext) => {
        if (!safeStorage.isEncryptionAvailable()) return;
        const encrypted = getEncryptedMsalCache();
        if (encrypted) {
            context.tokenCache.deserialize(
                safeStorage.decryptString(Buffer.from(encrypted, 'base64')),
            );
        }
    },
    // Called AFTER any cache operation -> if the cache has changed, save it encrypted
    afterCacheAccess: async (context: TokenCacheContext) => {
        if (!context.cacheHasChanged) return;
        if (!safeStorage.isEncryptionAvailable()) return;
        setEncryptedMsalCache(
            safeStorage
                .encryptString(context.tokenCache.serialize())
                .toString('base64'),
        );
    },
};
