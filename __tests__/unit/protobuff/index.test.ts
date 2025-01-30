import { describe, afterEach, expect, it, beforeAll, beforeEach } from '@jest/globals';
import express from 'express'
import State from '../../../src/tools/state.js'
import {defaultMiddlewareConfig as defaultConfig,defaultToasterConfig} from '../../../src/tools/config.js'
import { IFullError } from '../../../types/error.js';
import Protobuff from '../../../src/module/protobuf/index.js'
import fs from 'fs'
import FileWriter from '../../../src/module/files/writer.js'
import FileReader from '../../../src/module/files/reader.js'
import { ILogEntry } from '../../../types/logs.js';

describe('Protobuff', () => {
  const clear = async (target?: string): Promise<void> => {
    return new Promise<void>(resolve => {
      fs.rmdir(target ?? 'Toaster', { recursive: true }, (_err) => {
        resolve(undefined)
      })
    })
  }

  const buff = new Protobuff()
  const fileWriter = new FileWriter()
  const fileReader = new FileReader()

  const defaultReq: Partial<express.Request> = {
    method: 'POST',
    headers: {
      header: 'val'
    },
    ip: '127.0.0.1', // Don't dox me pls :(
    query: {
      key: "value"
    },
    body: {}
  }

  const fakeDuration=250
  const defaultCallback = {
    method: 'POST',
    body: '{}',
    queryParams: '{"key":"value"}',
    headers: '{"header":"val"}'
  }

  beforeAll(() => {
    State.config = { ...defaultConfig(), ip: true }
    State.toasterConfig=defaultToasterConfig()
  })

  afterEach(async () => {
    await clear()
  })

  beforeEach(async () => {
    await clear()
    State.config = defaultConfig()
    State.toasterConfig=defaultToasterConfig()
  })

  describe('Should throw', () => {
    //describe('No data passed', () => {});
    //describe('Incorrect data', () => {});
  });

  describe('Should pass', () => {
    it(`Decode sample file`, async () => {
      let error: IFullError | undefined = undefined
      let callback: ILogEntry | undefined = undefined

      try {
        await fileWriter.init(defaultReq as express.Request,fakeDuration)
        const encoded = fileReader.init()
        callback = await buff.decodeLogEntry(Object.values(encoded.logs)[0]!)
      } catch (err) {
        error = err as IFullError
      }

      expect(error).toBeUndefined()
      expect(callback?.body).toEqual(defaultCallback.body)
      expect(callback?.method).toEqual(defaultCallback.method)
      expect(callback?.headers).toEqual(defaultCallback.headers)
      expect(callback?.queryParams).toEqual(defaultCallback.queryParams)
    });

    it(`Encode sample file`, async () => {
      let error: IFullError | undefined = undefined

      try {
        await fileWriter.init(defaultReq as express.Request,fakeDuration)
        const encoded = fileReader.init()
        const decoded = await buff.decodeLogEntry(Object.values(encoded.logs)[0]!)
        await buff.encodeLog(decoded)
      } catch (err) {
        error = err as IFullError
      }

      expect(error).toBeUndefined()
    });
  });
});

