import { afterAll, afterEach, beforeAll, beforeEach, describe, jest, it, expect } from '@jest/globals';
import express from 'express';
import fs from 'fs';
import Decoder from '../../../src/module/decode/index.js';
import {defaultMiddlewareConfig as defaultConfig,defaultToasterConfig} from '../../../src/tools/config.js';
import State from '../../../src/tools/state.js';
import { IFullError } from '../../../types/error.js';
import { INotFormattedLogEntry } from '../../../types/logs.js';
import FileWriter from '../../../src/module/files/writer.js';

describe('Decoder', () => {
  const clear = async (target?: string): Promise<void> => {
    return new Promise<void>((resolve) => {
      fs.rmdir(target ?? 'Toaster', { recursive: true }, (_err) => {
        resolve(undefined);
      });
    });
  };
  const fileWriter = new FileWriter();
  const decoder = new Decoder();
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
    State.toasterConfig = { ...defaultToasterConfig()};
  });

  beforeEach(async () => {
    await clear();
    State.config = { ...defaultConfig(), ip: true };
    State.toasterConfig = { ...defaultToasterConfig()};
  });

  afterEach(async () => {
    await clear();
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('Should pass', () => {
    it(`decode - return request`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await decoder.init();
        await decoder.saveDecoded();
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
          ip:'127.0.0.1'
        },
      ]);
    });

    it(`decode - no request to return`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      try {
        callback = await decoder.init();
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback.length).toEqual(0);
    });

    it(`save decoded - creates file`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      let dir: string[] = [];
      try {
        await fileWriter.init(defaultReq as express.Request);
        callback = await decoder.init();
        await decoder.saveDecoded();
        dir = fs.readdirSync(State.config.path);
      } catch (err) {
        error = err as IFullError;
      }
      expect(error).toBeUndefined();
      expect(callback.length).toEqual(1);
      expect(dir).toContain('decoded_logs_0.json');
    });

    // TODO: this one is wrong i think
    it(`save decoded - no return`, async () => {
      let error: IFullError | undefined = undefined;
      let callback: [string, INotFormattedLogEntry][] = [];
      let dir: string[] = [];
      try {
        callback = await decoder.init();
        await decoder.saveDecoded();
        dir = fs.readdirSync(State.config.path);
      } catch (err) {
        error = err as IFullError;
      }
      console.log("DIRECTORY",dir)
      expect(error).toBeUndefined();
      expect(callback.length).toEqual(0);
      expect(dir.length).toEqual(1);
    });
  });
});
