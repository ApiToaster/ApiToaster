import { beforeAll, beforeEach, describe, expect, it } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import FileFinder from '../../../src/module/files/finder.js';
import FileWriter from '../../../src/module/files/writer.js';
import defaultConfig from '../../../src/tools/config.js';
import State from '../../../src/tools/state.js';
import { IFindParams } from '../../../types/cli.js';
import { IFullError } from '../../../types/error.js';
import { INotFormattedLogEntry } from '../../../types/logs.js';

describe('File finder', () => {
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
      'content-type': 'application/json',
      header: 'val',
    },
    ip: '127.0.0.1', // Don't dox me pls :(
    query: {
      key: 'value',
    },
    body: {},
  };

  const defaultFindParams: IFindParams = {
    files: [],
    keys: [],
    values: [],
    ips: [],
    json: {},
    methods: [],
    statusCodes: [],
  };

  const fileWriter = new FileWriter();
  const fileFinder = new FileFinder();

  beforeAll(() => {
    State.config = { ...defaultConfig(), ip: true };
  });

  beforeEach(async () => {
    await clear();
  });

  // describe('Should throw', () => {
  //describe('No data passed', () => {});
  //describe('Incorrect data', () => {});
  // });

  describe('Should pass', () => {
    it(`Find files - default config`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await fileFinder.find(defaultFindParams);
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(1);
      expect(callback[0]).toEqual([
        expect.anything(),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            header: 'val',
          },
          ip: '127.0.0.1',
          occured: expect.anything(),
          queryParams: {
            key: 'value',
          },
          body: {},
        },
      ]);
    });

    it(`Find files - different ip - no data`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await fileFinder.find({ ...defaultFindParams, ips: ['123.123.123.123'] });
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(0);
    });

    it(`Find files - different ip - data exists`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init({ ...defaultReq, ip: '123.123.123.123' } as express.Request);
        callback = await fileFinder.find({ ...defaultFindParams, ips: ['123.123.123.123'] });
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(1);
      expect(callback[0]).toEqual([
        expect.anything(),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            header: 'val',
          },
          ip: '123.123.123.123',
          occured: expect.anything(),
          queryParams: {
            key: 'value',
          },
          body: {},
        },
      ]);
    });

    it(`Find files - different json - no data`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await fileFinder.find({ ...defaultFindParams, json: { key: 'value' } });
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(0);
    });

    it(`Find files - different json - data exists`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init({ ...defaultReq, body: { key: 'value' } } as express.Request);
        callback = await fileFinder.find({ ...defaultFindParams, json: { key: 'value' } });
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(1);
      expect(callback[0]).toEqual([
        expect.anything(),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            header: 'val',
          },
          ip: '127.0.0.1',
          occured: expect.anything(),
          queryParams: {
            key: 'value',
          },
          body: { key: 'value' },
        },
      ]);
    });

    it(`Find files - different values - no data`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await fileFinder.find({ ...defaultFindParams, values: ['value'] });
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(0);
    });

    it(`Find files - different values - data exists`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init({ ...defaultReq, body: { key: 'value' } } as express.Request);
        callback = await fileFinder.find({ ...defaultFindParams, values: ['value'] });
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(1);
      expect(callback[0]).toEqual([
        expect.anything(),
        {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            header: 'val',
          },
          ip: '127.0.0.1',
          occured: expect.anything(),
          queryParams: {
            key: 'value',
          },
          body: { key: 'value' },
        },
      ]);
    });

    it(`Find files - different method - no data`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await fileFinder.find({ ...defaultFindParams, methods: ['GET'] });
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(0);
    });

    it(`Find files - different method - data exists`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];

      try {
        await fileWriter.init({ ...defaultReq, method: 'GET' } as express.Request);
        callback = await fileFinder.find({ ...defaultFindParams, methods: ['GET'] });
      } catch (err) {
        error = err as IFullError;
      }

      expect(error).toBeUndefined();
      expect(callback.length).toEqual(1);
      expect(callback[0]).toEqual([
        expect.anything(),
        {
          method: 'GET',
          headers: {
            'content-type': 'application/json',
            header: 'val',
          },
          ip: '127.0.0.1',
          occured: expect.anything(),
          queryParams: {
            key: 'value',
          },
          body: {},
        },
      ]);
    });
  });
});
