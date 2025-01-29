import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import FileWriter from '../../../src/module/files/writer.js';
import TimeTravel from '../../../src/module/timeTravel/index.js';
import { defaultMiddlewareConfig as defaultConfig, defaultToasterConfig } from '../../../src/tools/config.js';
import State from '../../../src/tools/state.js';
import { IFullError } from '../../../types/error.js';
import { IFindParams } from '../../../types/cli.js';
import { IToasterTimeTravel } from '../../../types/timeTravel.js';

describe('Time Travel', () => {
    let fetchMock: unknown;
    const clear = async (target?: string): Promise<void> => {
        return new Promise<void>((resolve) => {
            fs.rmdir(target ?? 'Toaster', { recursive: true }, (_err) => {
                resolve(undefined);
            });
        });
    };

    const timeTravel = new TimeTravel();
    const fileWriter = new FileWriter();

    const defaultReq: Partial<express.Request> = {
        method: 'POST',
        headers: {
            header: 'val',
        },
        ip: '127.0.0.1',
        query: {
            key: 'value',
        },
        body: {},
    };

    const defaultReq2: Partial<express.Request> = {
        method: 'POST',
        headers: {
            header: 'val',
        },
        ip: '127.0.0.1',
        body: {
            key2: 'value2',
        },
    };

    const params: IFindParams = {
        files: [],
        keys: [],
        values: [],
        ips: [],
        json: {},
        methods: [],
        statusCodes: [],
        path:''
    };

    const fakeDuration=250
    beforeAll(() => {
        State.config = { ...defaultConfig(), ip: true };
        fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                json: async () => { },
            } as Response),
        );
    });

    beforeEach(async () => {
        await clear();
        State.config = defaultConfig();
        State.toasterConfig = {...defaultToasterConfig(),...toasterConfig};
    });

    afterEach(async () => {
        await clear();
        jest.clearAllMocks();
    });

    afterAll(() => {
        jest.restoreAllMocks();
    });

    // describe('Should throw', () => {
    //describe('No data passed', () => {});
    //describe('Incorrect data', () => {});
    // });
    const toasterConfig: IToasterTimeTravel = {
        waitUntillNextReq: 0,
        inputBeforeNextReq: false,
        port: 0,
        countTime: false,
        logFileSize: 200,
    };

    describe('Should pass', () => {
        it(`init - sends requests`, async () => {
            let error: IFullError | undefined = undefined;
            let callback: unknown | undefined;
            try {
                await fileWriter.init(defaultReq as express.Request,fakeDuration);
                callback = await timeTravel.init( params);
            } catch (err) {
                error = err as IFullError;
            }
            expect(error).toBeUndefined();
            expect(callback).toBeUndefined();
            expect(fetchMock).toHaveBeenCalledWith(`http://localhost:0`, {
                method: 'POST',
                headers: {
                    'X-Toaster': 'true',
                    header: 'val',
                },
                body: '{}',
            });
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it(`init - sends filtered requests`, async () => {
            let error: IFullError | undefined = undefined;
            let callback: unknown | undefined;
            try {
                await fileWriter.init(defaultReq as express.Request,fakeDuration);
                await fileWriter.init(defaultReq2 as express.Request,fakeDuration);
                const newParams = structuredClone(params);
                newParams.values.push('value2');
                callback = await timeTravel.init( newParams);
            } catch (err) {
                error = err as IFullError;
            }
            expect(error).toBeUndefined();
            expect(callback).toBeUndefined();
            expect(fetchMock).toHaveBeenCalledWith(`http://localhost:0`, {
                method: 'POST',
                headers: {
                    'X-Toaster': 'true',
                    header: 'val',
                },
                body: JSON.stringify({
                    key2: 'value2',
                }),
            });
            expect(fetchMock).toHaveBeenCalledTimes(1);
        });

        it(`init - sends multiple requests`, async () => {
            let error: IFullError | undefined = undefined;
            let callback: unknown | undefined;
            try {
                await fileWriter.init(defaultReq as express.Request,fakeDuration);
                await fileWriter.init(defaultReq2 as express.Request,fakeDuration);
                callback = await timeTravel.init( params);
            } catch (err) {
                error = err as IFullError;
            }
            expect(error).toBeUndefined();
            expect(callback).toBeUndefined();
            expect(fetchMock).toHaveBeenCalledWith(`http://localhost:0`, {
                method: 'POST',
                headers: {
                    'X-Toaster': 'true',
                    header: 'val',
                },
                body: JSON.stringify({
                    key2: 'value2',
                }),
            });
            expect(fetchMock).toHaveBeenCalledWith(`http://localhost:0`, {
                method: 'POST',
                headers: {
                    'X-Toaster': 'true',
                    header: 'val',
                },
                body: JSON.stringify({
                    key2: 'value2',
                }),
            });
            expect(fetchMock).toHaveBeenCalledTimes(2);
        });
        it(`init - no request to be send`, async () => {
            let error: IFullError | undefined = undefined;
            let callback: unknown | undefined;
            try {
                callback = await timeTravel.init(params);
            } catch (err) {
                error = err as IFullError;
            }
            expect(error).toBeUndefined();
            expect(callback).toBeUndefined();
            expect(fetchMock).toHaveBeenCalledTimes(0);
        });
    });
});
