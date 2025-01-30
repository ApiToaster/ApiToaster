import { beforeEach, afterEach, describe, expect, it } from '@jest/globals';
import path from 'path';
import express from 'express';
import FileReader from '../../../src/module/files/reader.js';
import FileWriter from '../../../src/module/files/writer.js';
import State from '../../../src/tools/state.js';
import {defaultMiddlewareConfig as defaultConfig,defaultToasterConfig} from '../../../src/tools/config.js';
import { IIndex, ILogs, ILogsProto, INotFormattedLogEntry } from '../../../types/logs.js';
import { IFullError } from '../../../types/error.js';
import fs from 'fs';
import * as utils from '../../utils';

// Small note
// #TODO Those tests should run mocked fs modules. Due to jest Crashing with internal errors, this is like this.
describe('File writer', () => {
    const clear = async (target?: string): Promise<void> => {
        return new Promise<void>((resolve) => {
            fs.rmdir(target ?? 'Toaster', { recursive: true }, (_err) => {
                resolve(undefined);
            });
        });
    };

    const defaultReq: Partial<express.Request> = {
        method: 'POST',
        headers: {
            header: 'val',
        },
        ip: '127.0.0.1', // Don't dox me pls :(
        query: {
            key: 'value',
        },
        body: { test: 'asd' },
    };

    const fileWriter = new FileWriter();
    const fileReader = new FileReader();

    beforeEach(async () => {
        State.config = defaultConfig();
        State.toasterConfig=defaultToasterConfig()
        await clear();
        await clear('AnotherToaster');
        fileWriter.resetLogCount();
    });

    afterEach(async () => {
        await clear();
        await clear('AnotherToaster');
        fileWriter.resetLogCount();
    });

    const fakeTime=250

    describe('Should throw', () => {
        //describe('No data passed', () => {});
        //describe('Incorrect data', () => {});
    });

    describe('Should pass', () => {
        it(`Write file - buffed, default config`, async () => {
            let error: IFullError | undefined = undefined;
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        // Because we do not have an option to manipulate file size by hand, this is disabled. Test was manually started. Uncomment, after file size validation changes
        it(`Write file - buffed, default config - save 2 entries to 2 different files and test index location`, async () => {
            let error: IFullError | undefined = undefined;
            let callback: ILogsProto | ILogs | undefined = undefined;
            let callback2: ILogsProto | ILogs | undefined = undefined;

            State.toasterConfig = { ...State.toasterConfig, logFileSize: 1 };
            let dir: string[] = [];
            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init('logs_0.json');
                callback2 = fileReader.init('logs_1.json');
                dir = fs.readdirSync(State.config.path);
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(Object.keys(callback2?.logs ?? {}).length).toEqual(1);
            expect(dir).toContain('logs_0.json');
            expect(dir).toContain('logs_1.json');
            expect(error).toBeUndefined();
        });

        it(`Write file - buffed, different path in config`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, path: path.join(process.cwd(), 'AnotherToaster') };
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
                fs.readdirSync(path.join(process.cwd(), 'AnotherToaster'));
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        it(`Write file - buffed, do not log method in config`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, method: false };
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        it(`Write file - buffed, do not log body in config`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, body: false };
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        it(`Write file - buffed, do not log queryParams in config`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, queryParams: false };
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        it(`Write file - buffed, do not log headers in config`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, headers: false };
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        it(`Write file - buffed, do log ip in config`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, ip: true };
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        it(`Write file - buffed, do not obfuscate anything in config`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, obfuscate: [] };
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        it(`Write file - buffed, default config`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config };
            let callback: ILogsProto | ILogs | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init();
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(error).toBeUndefined();
        });

        it(`Write file - debuffed, disabled proto`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, disableProto: true };
            let callback: INotFormattedLogEntry | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = JSON.parse(Object.values((fileReader.init() as ILogsProto).logs)[0]!);
            } catch (err) {
                error = err as IFullError;
            }
            expect(callback?.body).toEqual(defaultReq.body);
            expect(callback?.method).toEqual(defaultReq.method);
            expect(callback?.headers).toEqual(defaultReq.headers);
            expect(callback?.queryParams).toEqual(defaultReq.query);
            expect(error).toBeUndefined();
        });

        it(`Write file - debuffed, disabled statusCode`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, statusCode: false, disableProto: true };
            let callback: INotFormattedLogEntry | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime, 200);
                callback = JSON.parse(Object.values((fileReader.init() as ILogsProto).logs)[0]!);
            } catch (err) {
                error = err as IFullError;
            }

            expect(callback?.body).toEqual(defaultReq.body);
            expect(callback?.method).toEqual(defaultReq.method);
            expect(callback?.headers).toEqual(defaultReq.headers);
            expect(callback?.queryParams).toEqual(defaultReq.query);
            expect(callback?.statusCode).toBeUndefined();
            expect(error).toBeUndefined();
        });
        it(`Write file - debuffed, enabled statusCode`, async () => {
            let error: IFullError | undefined = undefined;
            State.config = { ...State.config, disableProto: true };
            let callback: INotFormattedLogEntry | undefined = undefined;

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime, 400);
                callback = JSON.parse(Object.values((fileReader.init() as ILogsProto).logs)[0]!);
            } catch (err) {
                error = err as IFullError;
            }

            expect(callback?.body).toEqual(defaultReq.body);
            expect(callback?.method).toEqual(defaultReq.method);
            expect(callback?.headers).toEqual(defaultReq.headers);
            expect(callback?.queryParams).toEqual(defaultReq.query);
            expect(callback?.statusCode).toEqual(400);
            expect(error).toBeUndefined();
        });
        it(`Write file - debuffed, default config - save 2 entries to 2 different files and test index location`, async () => {
            let error: IFullError | undefined = undefined;
            let callback: ILogsProto | ILogs | undefined = undefined;
            let callback2: ILogsProto | ILogs | undefined = undefined;

            State.config={...State.config,disableProto:true}
            State.toasterConfig = { ...State.toasterConfig, logFileSize: 1 };
            let dir: string[] = [];
            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                callback = fileReader.init('logs_0.json');
                callback2 = fileReader.init('logs_1.json');
                dir = fs.readdirSync(State.config.path);
            } catch (err) {
                error = err as IFullError;
            }

            expect(Object.keys(callback?.logs ?? {}).length).toEqual(1);
            expect(Object.keys(callback2?.logs ?? {}).length).toEqual(1);
            expect(dir).toContain('logs_0.json');
            expect(dir).toContain('logs_1.json');
            expect(error).toBeUndefined();
        });
        it(`Write file - debuffed, default config - delete 2  malformed logs`, async () => {
            let error: IFullError | undefined = undefined;
            let malformed: string[] = [];
            const log = utils.fakeData.logs[0];
            const index = utils.fakeData.index[0];
            let updatedLogsContent: ILogsProto | ILogs = { meta: { logCount: 0 }, logs: {} };
            let updatedIndexContent: IIndex = { indexes: {} };

            State.config = { ...State.config, disableProto: true };
            let dir: string[] = [];

            try {
                await fileWriter.init(defaultReq as express.Request,fakeTime);
                fileWriter.save('logs_0.json', log);

                fileReader.preLoadLogs();
                fileWriter.save('index.json', index);
                malformed = fileReader.getMalformedLogs();
                dir = fs.readdirSync(State.config.path);

                fileWriter.deleteLog(malformed);
                updatedLogsContent = JSON.parse(fs.readFileSync(`${State.config.path}/logs_0.json`, 'utf8'));
                updatedIndexContent = JSON.parse(fs.readFileSync(`${State.config.path}/index.json`, 'utf8'));
                malformed.forEach((log) => {
                    expect(updatedLogsContent.logs[log]).toBeUndefined();
                    expect(updatedIndexContent.indexes[log]).toBeUndefined();
                });
            } catch (err) {
                error = err as IFullError;
            }
            expect(Object.entries(updatedLogsContent.logs).length).toEqual(1);
            expect(Object.entries(updatedIndexContent.indexes).length).toEqual(1);
            expect(dir).toContain('logs_0.json');
            expect(dir).toContain('index.json');
            expect(malformed.length).toEqual(2);
            expect(error).toBeUndefined();
        });
    });
});
