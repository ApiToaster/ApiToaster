import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import FileWriter from '../../../src/module/files/writer.js';
import TimeTravel from '../../../src/module/timeTravel/index.js';
import defaultConfig from '../../../src/tools/config.js';
import State from '../../../src/tools/state.js';
import { IFullError } from '../../../types/error.js';
import { INotFormattedLogEntry } from '../../../types/logs.js';

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
    ip: '127.0.0.1', // Don't dox me pls :(
    query: {
      key: 'value',
    },
    body: {},
  };

  beforeAll(() => {
    State.config = { ...defaultConfig(), ip: true };
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        status: 200,
        json: async () => {},
      } as Response),
    );
  });

  beforeEach(async () => {
    await clear();
    State.config = defaultConfig();
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

  describe('Should pass', () => {
    it(`decode - return request`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await timeTravel.decode();
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
            header: 'val',
          },
          occured: expect.anything(),
          queryParams: {
            key: 'value',
          },
          body: {},
        },
      ]);
    });
    it(`decode - no request to return`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      try {
        callback = await timeTravel.decode();
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback.length).toEqual(0);
    });
    it(`init - sends requests`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: unknown | undefined;
      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await timeTravel.init({ port: 0 });
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback).toBeUndefined();
      expect(fetchMock).toHaveBeenCalled();
    });
  });
});
