/*
 * Copyright (c) 2026 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { pipeline } from 'stream/promises';
import tarStream, { type Header } from 'tar-stream';
import { createGzip } from 'zlib';

import { untar } from './fileUtil';

type Entry = {
    name: string;
    type: Header['type'];
    linkname?: string;
    data?: string;
};

const CANARY = 'canary-original';
let root: string;
let dest: string;
let outside: string;
let archive: string;

/* Archives are written using same tgz format which untar expects. */
const writeArchive = async (entries: Entry[]) => {
    const pack = tarStream.pack();
    entries.forEach(({ name, type, linkname, data }) => {
        const header = { name, type, linkname, mode: 0o755 } as Header;
        if (type === 'file') pack.entry(header, data ?? '');
        else pack.entry(header);
    });
    pack.finalize();
    await pipeline(pack, createGzip(), fs.createWriteStream(archive));
};

/* Extraction may reject or succeed. Only the end state is asserted. */
const extract = async (entries: Entry[], strip = 0) => {
    await writeArchive(entries);
    await untar(archive, dest, strip).catch(() => undefined);
};

/* Nothing may be created in or changed under "outside", and the canary must be unchanged. */
const expectContained = () => {
    expect(fs.readdirSync(outside)).toEqual(['canary.txt']);
    expect(fs.readFileSync(path.join(outside, 'canary.txt'), 'utf8')).toBe(
        CANARY,
    );
};

beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'untar-test-'));
    dest = path.join(root, 'dest');
    outside = path.join(root, 'outside');
    archive = path.join(root, 'test.tgz');
    fs.mkdirSync(dest);
    fs.mkdirSync(outside);
    fs.writeFileSync(path.join(outside, 'canary.txt'), CANARY);
});

afterEach(() => fs.rmSync(root, { recursive: true, force: true }));

/* Symlink escapes: one hop, chains, replacement, dangling links, and overwrites. */
describe('symlink escapes', () => {
    const cases: [string, () => Entry[]][] = [
        [
            'symlink to ".." with no write through it',
            () => [{ name: 'link', type: 'symlink', linkname: '..' }],
        ],
        [
            'symlink to ../outside, then write through it',
            () => [
                { name: 'a', type: 'symlink', linkname: '../outside' },
                { name: 'a/evil', type: 'file' },
            ],
        ],
        [
            'symlink to absolute outside dir, then write through it',
            () => [
                { name: 'a', type: 'symlink', linkname: outside },
                { name: 'a/evil', type: 'file' },
            ],
        ],
        [
            'two-hop chain, forward order',
            () => [
                { name: 'b', type: 'symlink', linkname: '../outside' },
                { name: 'a', type: 'symlink', linkname: 'b' },
                { name: 'a/evil', type: 'file' },
            ],
        ],
        [
            'two-hop chain, reverse order (dangling first)',
            () => [
                { name: 'a', type: 'symlink', linkname: 'b' },
                { name: 'b', type: 'symlink', linkname: '../outside' },
                { name: 'a/evil', type: 'file' },
            ],
        ],
        [
            'file overwrites through symlink to outside file',
            () => [
                {
                    name: 's',
                    type: 'symlink',
                    linkname: '../outside/canary.txt',
                },
                { name: 's', type: 'file', data: 'PWNED' },
            ],
        ],
        [
            'double symlink to outside file, then overwrite',
            () => [
                {
                    name: 's2',
                    type: 'symlink',
                    linkname: '../outside/canary.txt',
                },
                { name: 's1', type: 'symlink', linkname: 's2' },
                { name: 's1', type: 'file', data: 'PWNED' },
            ],
        ],
        [
            'dangling symlink to new outside path, then write',
            () => [
                { name: 's', type: 'symlink', linkname: '../outside/new' },
                { name: 's', type: 'file', data: 'PWNED' },
            ],
        ],
    ];

    test.each(cases)('%s', async (_name, entries) => {
        await extract(entries());
        expectContained();
    });
});

/* Hardlink escapes: targets that are outside, or that reach outside through a symlink. */
describe('hardlink escapes', () => {
    const cases: [string, () => Entry[]][] = [
        [
            'hardlink to a symlink that points outside, then overwrite',
            () => [
                {
                    name: 's',
                    type: 'symlink',
                    linkname: '../outside/canary.txt',
                },
                { name: 'h', type: 'link', linkname: 's' },
                { name: 'h', type: 'file', data: 'PWNED' },
            ],
        ],
        [
            'hardlink whose target path goes through an escaping symlink',
            () => [
                { name: 's', type: 'symlink', linkname: '../outside' },
                { name: 'h', type: 'link', linkname: 's/canary.txt' },
                { name: 'h', type: 'file', data: 'PWNED' },
            ],
        ],
        [
            'hardlink through a double symlink',
            () => [
                { name: 'b', type: 'symlink', linkname: '../outside' },
                { name: 'a', type: 'symlink', linkname: 'b' },
                { name: 'h', type: 'link', linkname: 'a/canary.txt' },
                { name: 'h', type: 'file', data: 'PWNED' },
            ],
        ],
        [
            'hardlink created inside a symlinked directory',
            () => [
                { name: 'f', type: 'file', data: 'inside' },
                { name: 's', type: 'symlink', linkname: '../outside' },
                { name: 's/leak', type: 'link', linkname: 'f' },
            ],
        ],
    ];

    test.each(cases)('%s', async (_name, entries) => {
        await extract(entries());
        expectContained();
    });

    test('hardlink to an outside canary is not created', async () => {
        await extract([
            { name: 'h', type: 'link', linkname: '../outside/canary.txt' },
        ]);
        expect(fs.existsSync(path.join(dest, 'h'))).toBe(false);
        expectContained();
    });
});

/* Safe archives: proves the same helpers accept safe input and that extraction works. */
describe('safe archives still extract', () => {
    test('files, safe symlink, and hardlink are created with correct content', async () => {
        await extract([
            { name: 'd', type: 'directory' },
            { name: 'd/f', type: 'file', data: 'hello' },
            { name: 'in', type: 'symlink', linkname: 'd/f' },
            { name: 'hl', type: 'link', linkname: 'd/f' },
        ]);
        expect(fs.readFileSync(path.join(dest, 'd/f'), 'utf8')).toBe('hello');
        expect(fs.readFileSync(path.join(dest, 'hl'), 'utf8')).toBe('hello');
        expect(fs.readlinkSync(path.join(dest, 'in'))).toBe('d/f');
        expectContained();
    });

    test('strip=1 keeps a package layout and a relative symlink inside dest', async () => {
        await extract(
            [
                { name: 'package/', type: 'directory' },
                { name: 'package/package.json', type: 'file', data: '{}' },
                { name: 'package/dist/main.js', type: 'file', data: 'main' },
                {
                    name: 'package/dist/link.js',
                    type: 'symlink',
                    linkname: 'main.js',
                },
                { name: 'top/a.txt', type: 'file', data: 'data' },
                { name: 'top/b.txt', type: 'link', linkname: 'top/a.txt' },
            ],
            1,
        );
        expect(fs.readFileSync(path.join(dest, 'package.json'), 'utf8')).toBe(
            '{}',
        );
        expect(fs.readFileSync(path.join(dest, 'dist/link.js'), 'utf8')).toBe(
            'main',
        );
        expect(fs.readFileSync(path.join(dest, 'b.txt'), 'utf8')).toBe('data');
        expectContained();
    });
});
