import { afterEach, beforeAll, beforeEach, describe, it, expect } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import {defaultMiddlewareConfig as defaultConfig,defaultToasterConfig} from '../../../src/tools/config.js';
import * as enums from '../../../src/enums/cli.js';
import State from '../../../src/tools/state.js';
import { IFullError } from '../../../types/error.js';
import FileWriter from '../../../src/module/files/writer.js';
import Migration from '../../../src/module/migration/index.js';
import { ILogs } from '../../../types/logs.js';

describe('Migration', () => {
    const clear = async (target?: string): Promise<void> => {
        return new Promise<void>((resolve) => {
            fs.rmdir(target ?? 'Toaster', { recursive: true }, (_err) => {
                resolve(undefined);
            });
        });
    };
    const fakeDuration=240
    const fileWriter = new FileWriter();
    const migration = new Migration();
    const defaultReq: Partial<express.Request> = {
        method: 'POST',
        headers: {
            header: 'val',
        },
        ip: '127.0.0.1', // Don't dox me pls :(
        query: {
            key: 'value',
        },
        body: {},
    };
    beforeAll(() => {
        State.config = { ...defaultConfig(), ip: true };
        State.toasterConfig=defaultToasterConfig()
    });

    beforeEach(async () => {
        await clear();
        State.config = { ...defaultConfig(), ip: true };
        State.toasterConfig=defaultToasterConfig()
    });

    afterEach(async () => {
        await clear();
    });

    describe('Should pass', () => {
        it(`migration - create not empty migration file -PROTO to JSON`, async () => {
            let error: IFullError | undefined = undefined;
            let dir: string[] = [];
            let migratedFile: ILogs = { meta: { logCount: 0 }, logs: {} };

            try {
                await fileWriter.init(defaultReq as express.Request,fakeDuration);
                await migration.init('logs_0.json', enums.ECliFlags.FormatJson);
                dir = fs.readdirSync(State.config.path);
                migratedFile = JSON.parse(fs.readFileSync(`${State.config.path}/migrate_logs_0.json`, 'utf-8'));
            } catch (err) {
                error = err as IFullError;
            }
            expect(error).toBeUndefined();
            expect(dir.length).toBeGreaterThan(0);
            expect(dir).toContain('migrate_logs_0.json');
            expect(Object.values(migratedFile.logs)[0]).toEqual({
                method: 'POST',
                headers: {
                    header: 'val',
                },
                ip: '127.0.0.1',
                occured: expect.anything(),
                queryParams: {
                    key: 'value',
                },
                statusCode: 0,
                body: {},
                duration:fakeDuration
            });
        });

        it(`migration - create not empty migration file -JSON to PROTO`, async () => {
            let error: IFullError | undefined = undefined;
            let dir: string[] = [];
            let migratedFile: ILogs = { meta: { logCount: 0 }, logs: {} };

            State.config.disableProto = true;
            try {
                await fileWriter.init(defaultReq as express.Request,fakeDuration);
                await migration.init('logs_0.json', enums.ECliFlags.FormatProto);
                dir = fs.readdirSync(State.config.path);
                migratedFile = JSON.parse(fs.readFileSync(`${State.config.path}/migrate_logs_0.json`, 'utf-8'));
            } catch (err) {
                error = err as IFullError;
            }
            expect(error).toBeUndefined();
            expect(dir.length).toBeGreaterThan(0);
            expect(dir).toContain('migrate_logs_0.json');
            expect(Object.values(migratedFile.logs)[0]).toEqual(expect.any(String));
            expect(Object.keys(migratedFile.logs)[0]).toEqual(expect.any(String));
        });

        it(`migration - create migration JSON file, from partial JSON-PROTO file`, async () => {
            let error: IFullError | undefined = undefined;
            let dir: string[] = [];
            let migratedFile: ILogs = { meta: { logCount: 0 }, logs: {} };
            State.config.disableProto = true;
            try {
                await fileWriter.init(defaultReq as express.Request,fakeDuration, 0);
                State.config.disableProto = false;
                await fileWriter.init(defaultReq as express.Request,fakeDuration, 0);
                await migration.init('logs_0.json', enums.ECliFlags.FormatJson);
                dir = fs.readdirSync(State.config.path);
                migratedFile = JSON.parse(fs.readFileSync(`${State.config.path}/migrate_logs_0.json`, 'utf-8'));
            } catch (err) {
                error = err as IFullError;
            }
            expect(error).toBeUndefined();
            expect(dir.length).toBeGreaterThan(0);
            expect(dir).toContain('migrate_logs_0.json');
            expect(Object.keys(migratedFile.logs)[0]).toEqual(expect.any(String));
            expect(Object.keys(migratedFile.logs)[1]).toEqual(expect.any(String));
            expect(Object.values(migratedFile.logs)[0]).toEqual({
                method: 'POST',
                headers: {
                    header: 'val',
                },
                ip: '127.0.0.1',
                occured: expect.anything(),
                statusCode: 0,
                queryParams: {
                    key: 'value',
                },
                body: {},
                duration:fakeDuration
            });
            expect(Object.values(migratedFile.logs)[1]).toEqual({
                method: 'POST',
                headers: {
                    header: 'val',
                },
                ip: '127.0.0.1',
                occured: expect.anything(),
                statusCode: 0,
                queryParams: {
                    key: 'value',
                },
                body: {},
                duration:fakeDuration
            });
        });
        it(`migration - migrate from JSON to PROTO, and from PROTO to JSON -it is the same as original`, async () => {
            let error: IFullError | undefined = undefined;
            let dir: string[] = [];
            let migratedFile: ILogs = { meta: { logCount: 0 }, logs: {} };
            let origin: ILogs = { meta: { logCount: 0 }, logs: {} };

            State.config.disableProto = true;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeDuration, 0);
                await migration.init('logs_0.json', enums.ECliFlags.FormatProto);
                dir = fs.readdirSync(State.config.path);
                await migration.init('migrate_logs_0.json', enums.ECliFlags.FormatJson);
                migratedFile = JSON.parse(fs.readFileSync(`${State.config.path}/migrate_migrate_logs_0.json`, 'utf-8'));
                origin = JSON.parse(fs.readFileSync(`${State.config.path}/logs_0.json`, 'utf-8'));
            } catch (err) {
                error = err as IFullError;
            }
            expect(error).toBeUndefined();
            expect(dir.length).toBeGreaterThan(0);
            expect(dir).toContain('migrate_logs_0.json');
            expect(Object.values(migratedFile.logs)[0]).toEqual(
                JSON.parse(Object.values(origin.logs)[0] as unknown as string),
            );
        });
    });
});
