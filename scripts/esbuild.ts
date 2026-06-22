#!/usr/bin/env tsx

/*
 * Copyright (c) 2022 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { node as nodeVersion } from '@nordicsemiconductor/pc-nrfconnect-shared/scripts/versions';
import esbuild, { type BuildOptions } from 'esbuild';
import * as fs from 'node:fs';

import { dependencies } from '../package.json';

const packageJson = fs.readFileSync('package.json', 'utf8');

const options = {
    bundle: true,
    color: true,
    entryPoints: ['src/main/index.ts'],
    external: [
        'electron',
        ...Object.keys(dependencies ?? {}).filter(d => d !== 'move-file'),
    ],
    logLevel: 'info',
    outfile: 'dist/main.js',
    platform: 'node',
    sourcemap: true,
    define: {
        'process.env.NODE_ENV': `"${
            process.argv.includes('--prod') ? 'production' : 'development'
        }"`,
        'process.env.APPLICATIONINSIGHTS_CONFIGURATION_CONTENT': '"{}"', // Needed because of https://github.com/microsoft/ApplicationInsights-node.js/issues/1226
        'process.env.PACKAGE_JSON': JSON.stringify(packageJson),
        'process.env.OVERRIDE_JLINK_VERSION': JSON.stringify(
            process.env.OVERRIDE_JLINK_VERSION ?? '',
        ),
    },
    minify: process.argv.includes('--prod'),
    target: [`node${nodeVersion}`],
} satisfies BuildOptions;

const build = async () => {
    if (process.argv.includes('--watch')) {
        const context = await esbuild.context(options);

        await context.rebuild();
        await context.watch();
    } else {
        esbuild.build(options);
    }
};

const extractLatestChangelogEntry = () => {
    const changelog = fs.readFileSync('Changelog.md', 'utf8');
    const latestEntry = changelog.split(/^## .*$/m)[1].trim();
    fs.mkdirSync('release', { recursive: true });
    fs.writeFileSync('release/changelog.md', latestEntry);
};

build();
extractLatestChangelogEntry();
