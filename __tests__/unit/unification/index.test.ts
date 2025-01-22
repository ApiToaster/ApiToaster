import readline from 'readline';
import { afterEach, beforeAll, beforeEach, describe, it, expect, jest } from '@jest/globals';
import * as errors from '../../../src/errors/index.js';
import express from 'express';
import fs from 'fs';
import {defaultMiddlewareConfig as defaultConfig,defaultToasterConfig} from '../../../src/tools/config.js';
import * as utils from '../../utils/index.js';
import Cli from '../../../src/cli/index.js';
import State from '../../../src/tools/state.js';
import Log from '../../../src/tools/logger.js';
import { IFullError } from '../../../types/error.js';
import FileWriter from '../../../src/module/files/writer.js';
import FileDecoder from '../../../src/module/decode/index.js';
import FileReader from '../../../src/module/files/reader.js';
import Unification from '../../../src/module/unification/index.js';
import { INotFormattedLogEntry } from '../../../types/logs.js';
import { IUnificationParams } from '../../../types/unification.js';
import { mock } from 'node:test';

describe('Unification', () => {
  const clear = async (target?: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      fs.rmdir(target ?? 'Toaster', { recursive: true }, (_err) => {
        resolve(undefined);
      });
    });
  };
  const fileWriter = new FileWriter();
  const fileDecoder = new FileDecoder();
  const fileReader = new FileReader();
  const unification = new Unification();
  const cli = new Cli();
  const params: IUnificationParams = {
    files: [],
    values: [],
    remove: false,
  };
  const defaultReq: Partial<express.Request> = {
    method: 'GET',
    params: { key: 'value' },
    headers: {
      key: 'val',
    },
    query: {
      key: 'value',
    },
    ip: '127.0.0.2',
    body: { key: 'value' },
  };

  const mockInterfaceN = {
    question: (_query: string, callback: (answer: string) => void) => {
      callback('N'); // Simulate the user input as 'N'
    },
    close: () => { },
  };

  const mockInterfaceY = {
    question: (_query: string, callback: (answer: string) => void) => {
      callback('Y'); // Simulate the user input as 'N'
    },
    close: () => { },
  };

  beforeAll(() => {
    State.config = { ...defaultConfig(), ip: true };
    State.toasterConfig=defaultToasterConfig()
  });

  beforeEach(async () => {
    jest.spyOn(Log, 'error').mockImplementation(() => { });
    await clear();
    State.config = { ...defaultConfig(), ip: true };
    State.toasterConfig=defaultToasterConfig()
  });

  afterEach(async () => {
    jest.restoreAllMocks();
    await clear();
  });

  describe('Should throw', () => {
    it('unification - wrong key parametr', async () => {

      let error: IFullError | undefined = undefined;
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };

      jest.spyOn(FileReader, 'readConfig').mockReturnValue({
        path: '/valid/path',
        port: 0,
        countTime:false,
        logFileSize:200
      });
      try {
        process.argv = ['npx', 'api-toaster', 'uni', '-p', 'logs_0.json', '-v', 'ksdjfsdkfj'];
        await cli.handleInit();
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeInstanceOf(errors.IncorrectArgTypeError);
      expect(error).toEqual(new errors.IncorrectArgTypeError('Passed value should be a valid IUnificationKey'));
    });

    it('unification - throw error if there are malformed logs', async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };
      const log = utils.fakeData.logs[0];
      const index = utils.fakeData.index[0];
      // I can not make this mock work with jest, so for now im using node:mock
      mock.method(readline, 'createInterface', () => mockInterfaceN);
      try {
        await fileWriter.init(defaultReq as express.Request);
        fileWriter.save('logs_0.json', log);

        fileReader.preLoadLogs();
        fileWriter.save('index.json', index);
        await unification.init(params);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toEqual(new errors.ApplyingDefaultsError());
      expect(callback.length).toEqual(0);
    });
  });

  describe('Should pass', () => {
    it(`unification - add default method value`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      try {
        await fileWriter.init(defaultReq as express.Request);
        await unification.init(params);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        method: 'GET',
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        occured: expect.anything(),
        queryParams: {
          key: 'value',
        },
        body: { key: 'value' },
        statusCode: 200,
      });
    });

    it(`unification - add only specified default value for method`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('method');
        await fileWriter.init(defaultReq as express.Request, 200);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        method: 'GET',
        occured: expect.anything(),
        body: {},
        statusCode: 200,
      });
    });

    it(`unification -debuffed add only specified default value for method`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = {
        ...defaultConfig(),
        disableProto: true,
        ip: false,
        headers: false,
        body: false,
        method: false,
        queryParams: false,
      };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('method');
        await fileWriter.init(defaultReq as express.Request, 200);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        method: 'GET',
        occured: expect.anything(),
        body: {},
        statusCode: 200,
      });
    });
    it(`unification - add only specified default value for queryParams`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('queryParams');
        await fileWriter.init(defaultReq as express.Request, 200);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: {},
        queryParams: { key: 'value' },
        statusCode: 200,
      });
    });

    it(`unification -debuffed add only specified default value for queryParams`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = {
        ...defaultConfig(),
        disableProto: true,
        ip: false,
        headers: false,
        body: false,
        method: false,
        queryParams: false,
      };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('queryParams');
        await fileWriter.init(defaultReq as express.Request, 200);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: {},
        queryParams: { key: 'value' },
        statusCode: 200,
      });
    });
    it(`unification - add only specified default value for statusCode`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('statusCode');
        await fileWriter.init(defaultReq as express.Request);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: {},
        statusCode: 200,
      });
    });
    it(`unification -debuffed add only specified default value for statusCode`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = {
        ...defaultConfig(),
        disableProto: true,
        ip: false,
        headers: false,
        body: false,
        method: false,
        queryParams: false,
      };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('statusCode');
        await fileWriter.init(defaultReq as express.Request);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: {},
        statusCode: 200,
      });
    });

    it(`unification - add only specified default value for headers`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('headers');
        await fileWriter.init(defaultReq as express.Request);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: {},
        headers: { key: 'value' },
      });
    });
    it(`unification -debuffed add only specified default value for headers`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = {
        ...defaultConfig(),
        disableProto: true,
        ip: false,
        headers: false,
        body: false,
        method: false,
        queryParams: false,
      };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('headers');
        await fileWriter.init(defaultReq as express.Request);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: {},
        headers: { key: 'value' },
      });
    });

    it(`unification - add only specified default value for method and ip`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('ip');
        paramsClone.values.push('method');
        await fileWriter.init(defaultReq as express.Request, 200);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        method: 'GET',
        ip: '::ffff:127.0.0.1',
        occured: expect.anything(),
        body: {},
        statusCode: 200,
      });
    });
    it(`unification -debuffed add only specified default value for method and ip`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = {
        ...defaultConfig(),
        disableProto: true,
        ip: false,
        headers: false,
        body: false,
        method: false,
        queryParams: false,
      };
      try {
        const paramsClone = structuredClone(params);
        paramsClone.values.push('ip');
        paramsClone.values.push('method');
        await fileWriter.init(defaultReq as express.Request, 200);
        await unification.init(paramsClone);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        method: 'GET',
        ip: '::ffff:127.0.0.1',
        occured: expect.anything(),
        body: {},
        statusCode: 200,
      });
    });

    it(`unification - add all default values`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };
      try {
        await fileWriter.init(defaultReq as express.Request);
        await unification.init(params);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        method: 'GET',
        ip: '::ffff:127.0.0.1',
        occured: expect.anything(),
        body: {},
        statusCode: 200,
        headers: { key: 'value' },
        queryParams: { key: 'value' },
      });
    });

    it(`unification -debuffed add all default values`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = {
        ...defaultConfig(),
        disableProto: true,
        ip: false,
        headers: false,
        body: false,
        method: false,
        queryParams: false,
      };
      try {
        await fileWriter.init(defaultReq as express.Request);
        await unification.init(params);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        method: 'GET',
        ip: '::ffff:127.0.0.1',
        occured: expect.anything(),
        body: {},
        statusCode: 200,
        headers: { key: 'value' },
        queryParams: { key: 'value' },
      });
    });
    it(`unification - remove ip`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('ip');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        method: 'GET',
        headers: {
          key: 'val',
        },
        queryParams: { key: 'value' },
        statusCode: 200,
      });
    });

    it(`unification -debuffed remove ip`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true, disableProto: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('ip');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        method: 'GET',
        headers: {
          key: 'val',
        },
        queryParams: { key: 'value' },
        statusCode: 200,
      });
    });
    it(`unification - remove headers`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('headers');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        method: 'GET',
        queryParams: { key: 'value' },
        ip: '127.0.0.2',
        statusCode: 200,
      });
    });

    it(`unification -debuffed remove headers`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true, disableProto: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('headers');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        method: 'GET',
        queryParams: { key: 'value' },
        ip: '127.0.0.2',
        statusCode: 200,
      });
    });
    it(`unification - remove queryparams`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('queryParams');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        method: 'GET',
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        statusCode: 200,
      });
    });
    it(`unification -debuffed remove queryparams`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true, disableProto: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('queryParams');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        method: 'GET',
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        statusCode: 200,
      });
    });
    it(`unification - remove statusCode`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('statusCode');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        method: 'GET',
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        queryParams: {
          key: 'value',
        },
      });
    });
    it(`unification -debuffed remove statusCode`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true, disableProto: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('statusCode');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        method: 'GET',
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        queryParams: {
          key: 'value',
        },
      });
    });
    it(`unification - remove method`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('method');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        queryParams: {
          key: 'value',
        },
        statusCode: 200,
      });
    });
    it(`unification -debuffed remove method`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true, disableProto: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('method');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.anything(),
        body: { key: 'value' },
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        queryParams: {
          key: 'value',
        },
        statusCode: 200,
      });
    });

    it(`unification - remove body`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('body');
        await unification.init(cloneParams);

        mock.method(readline, 'createInterface', () => mockInterfaceN);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.any(String),
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        queryParams: {
          key: 'value',
        },
        method: 'GET',
        statusCode: 200,
      });
    });
    it(`unification -debuffed remove body`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true, disableProto: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('body');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        occured: expect.any(String),
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        queryParams: {
          key: 'value',
        },
        method: 'GET',
        statusCode: 200,
      });
    });

    it(`unification - remove occured`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('occured');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        body: { key: 'value' },
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        queryParams: {
          key: 'value',
        },
        method: 'GET',
        statusCode: 200,
      });
    });
    it(`unification -debuffed remove occured`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      State.config = { ...defaultConfig(), ip: true, disableProto: true };
      try {
        await fileWriter.init(defaultReq as express.Request, 200);
        const cloneParams = structuredClone(params);
        cloneParams.remove = true;
        cloneParams.values.push('occured');
        await unification.init(cloneParams);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback[0]![1]).toEqual({
        body: { key: 'value' },
        headers: {
          key: 'val',
        },
        ip: '127.0.0.2',
        queryParams: {
          key: 'value',
        },
        method: 'GET',
        statusCode: 200,
      });
    });
    it('unification - add default values and remove malformed logs', async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      let malformed: string[] = [];
      State.config = { ...defaultConfig(), ip: false, headers: false, body: false, method: false, queryParams: false };
      const log = utils.fakeData.logs[0];
      const index = utils.fakeData.index[0];
      mock.method(readline, 'createInterface', () => mockInterfaceY);
      try {
        await fileWriter.init(defaultReq as express.Request);
        fileWriter.save('logs_0.json', log);
        // fileReader.preLoadLogs();
        malformed = fileReader.getMalformedLogs();
        fileWriter.save('index.json', index);
        await unification.init(params);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(callback[0]![0]).toEqual(Object.keys(utils.fakeData.logs[0]!.logs)[0]);
      expect(error).toBeUndefined();
      expect(malformed.length).toEqual(2);
    });
    it('unification -debuffed add default values and remove malformed logs', async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      let malformed: string[] = [];
      State.config = {
        ...defaultConfig(),
        disableProto: true,
        ip: false,
        headers: false,
        body: false,
        method: false,
        queryParams: false,
      };
      const log = utils.fakeData.logs[0];
      const index = utils.fakeData.index[0];
      mock.method(readline, 'createInterface', () => mockInterfaceY);
      try {
        await fileWriter.init(defaultReq as express.Request);
        fileWriter.save('logs_0.json', log);
        malformed = fileReader.getMalformedLogs();
        fileWriter.save('index.json', index);
        await unification.init(params);
        callback = await fileDecoder.init('logs_0.json');
      } catch (err) {
        error = err as IFullError;
      }
      expect(callback[0]![0]).toEqual(Object.keys(utils.fakeData.logs[0]!.logs)[0]);
      expect(error).toBeUndefined();
      expect(malformed.length).toEqual(2);
    });
  });
});
