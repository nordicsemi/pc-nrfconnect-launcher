/*
 * Copyright (c) 2015 Nordic Semiconductor ASA
 *
 * SPDX-License-Identifier: LicenseRef-Nordic-4-Clause
 */

import chmodr from 'chmodr';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { extract, type Headers } from 'tar-fs';
import { createGunzip } from 'zlib';
import { type z } from 'zod';

import describeError from './describeError';
import { logger } from './log';

export const ifExists = (filePath: string) =>
    fs.existsSync(filePath) ? filePath : undefined;

export const readFile = (filePath: string) => {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        throw new Error(`Unable to read ${filePath}: ${describeError(error)}`);
    }
};

export const readJsonFile = <T>(filePath: string, defaultValue?: T) => {
    try {
        return <T>JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (error) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }

        throw new Error(`Unable to parse ${filePath}: ${describeError(error)}`);
    }
};
export const readSchemedJsonFile = <T extends z.ZodTypeAny>(
    filePath: string,
    schema: T,
    defaultValue?: z.infer<T>,
): z.infer<T> => {
    try {
        const content = readJsonFile(filePath);
        return schema.parse(content);
    } catch (error) {
        if (defaultValue !== undefined) {
            return defaultValue;
        }

        throw new Error(`Unable to parse ${filePath}: ${describeError(error)}`);
    }
};

const isDirectory = (dirPath: string) => (file: string) => {
    const fileStats = fs.statSync(path.join(dirPath, file));

    return fileStats.isDirectory() && !file.startsWith('.');
};

export const listDirectories = (dirPath: string): string[] =>
    !fs.existsSync(dirPath)
        ? []
        : fs.readdirSync(dirPath).filter(isDirectory(dirPath));

const isFile = (dirPath: string, file: string) => {
    const fileStats = fs.statSync(path.join(dirPath, file));
    return fileStats.isFile();
};

export const listFiles = (dirPath: string, filterRegex: RegExp) =>
    !fs.existsSync(dirPath)
        ? []
        : fs
              .readdirSync(dirPath)
              .filter(file => isFile(dirPath, file))
              .filter(file => filterRegex.test(file));

export const deleteFile = (filePath: string) => {
    try {
        fs.unlinkSync(filePath);
    } catch (error) {
        throw new Error(
            `Unable to delete ${filePath}: ${describeError(error)}`,
        );
    }
};

export const copy = (src: string, dest: string) => {
    try {
        fs.cpSync(src, dest, { force: true, recursive: true });
    } catch (error) {
        throw new Error(`Unable to copy ${src}: ${describeError(error)}`);
    }
};

type TarHeader = Headers & { linkname?: string | null };

const isUnsafeReason = (p?: string | null) => {
    if (!p) return null;
    if (path.posix.isAbsolute(p)) return 'is absolute posix path';
    if (path.win32.isAbsolute(p) || /^[a-zA-Z]:/.test(p))
        return 'is absolute Windows path';
    if (p.split(/[\\/]/).includes('..')) return 'contains path traversal';
    if (p.includes('\0')) return 'NUL byte in path';
    return null;
};

export const untar = async (
    src: string,
    dest: string,
    stripComponents: number,
) => {
    const problems: string[] = [];
    try {
        const extraction = extract(dest, {
            strip: stripComponents,
            map: (header: TarHeader) => {
                [header.name, header.linkname]
                    .map(p => ({ p, reason: isUnsafeReason(p) }))
                    .filter(({ reason }) => reason !== null)
                    .map(({ p, reason }) => `${p}: ${reason}`)
                    .forEach(p => {
                        problems.push(p);
                    });

                return header;
            },
        });

        await pipeline(fs.createReadStream(src), createGunzip(), extraction);
    } catch (e) {
        throw new Error(`Unable to extract ${src}: ${describeError(e)}`);
    }
    if (problems.length > 0)
        logger.warn(
            `Possibly unsafe archive entries:\n${problems.join('\n\t')}`,
        );
    else logger.info('No unsafe archive entries found');
};

const defaultMode =
    fs.constants.S_IRWXU | // eslint-disable-line no-bitwise
    fs.constants.S_IRGRP |
    fs.constants.S_IXGRP |
    fs.constants.S_IROTH |
    fs.constants.S_IXOTH;

export const chmod = (filePath: string, mode: fs.Mode = defaultMode) => {
    fs.chmodSync(filePath, mode);
};

export const chmodDir = (src: string, mode: fs.Mode = defaultMode) =>
    new Promise<void>((resolve, reject) => {
        chmodr(src, mode, error => {
            if (error) {
                reject(
                    new Error(
                        `Unable to change mode to ${src}: ${describeError(error)}`,
                    ),
                );
            } else {
                resolve();
            }
        });
    });

export const writeFile = (filePath: string, data: string) => {
    try {
        fs.writeFileSync(filePath, data);
    } catch (error) {
        throw new Error(`Unable to write ${filePath}: ${describeError(error)}`);
    }
};

export const writeJsonFile = (filePath: string, jsonData: unknown) =>
    writeFile(filePath, JSON.stringify(jsonData, undefined, 2));

export const writeSchemedJsonFile = <T extends z.ZodTypeAny>(
    filePath: string,
    schema: T,
    jsonData: z.infer<T>,
) => {
    const parsed = schema.safeParse(jsonData);
    if (parsed.success) {
        writeJsonFile(filePath, parsed.data);
    } else {
        throw new Error(
            `Malformed data, not written to ${filePath}: ${parsed.error}`,
        );
    }
};
