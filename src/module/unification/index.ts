import { ApplyingDefaultsError } from '../../errors/index.js';
import Log from '../../tools/logger.js';
import { checkIfObject } from '../../utils/index.js';
import FileController from '../files/controller.js';
import FileReader from '../files/reader.js';
import FileWriter from '../files/writer.js';
import Proto from '../protobuf/index.js';
import Utils from '../utils/index.js';
import type { ILogEntry, ILogs, ILogsProto, IUnifiactionKey, IUnificationParams } from '../../../types/index.js';

export default class Unification {
  private readonly _fileReader: FileReader;
  private readonly _fileWriter: FileWriter;
  private readonly _fileController: FileController;
  private readonly _utils: Utils;
  private _logs: ILogsProto | ILogs = { meta: { logCount: 0 }, logs: {} };
  private _proto: Proto;

  constructor() {
    this._fileReader = new FileReader();
    this._fileController = new FileController();
    this._fileWriter = new FileWriter();
    this._utils = new Utils(this._fileReader, this._fileWriter);
    this._proto = new Proto();
  }

  private get logs(): ILogsProto | ILogs {
    return this._logs;
  }

  private set logs(logs: ILogsProto | ILogs) {
    this._logs = logs;
  }

  private get fileController(): FileController {
    return this._fileController;
  }

  private get fileReader(): FileReader {
    return this._fileReader;
  }

  private get fileWriter(): FileWriter {
    return this._fileWriter;
  }

  private get proto(): Proto {
    return this._proto;
  }
  private get utils(): Utils {
    return this._utils;
  }

  /**
   * Unificate file.
   * @description Unificate logs and add empty fields if missing in original file.
   * @param params Params for unification.
   * @returns {void} Void.
   * @async
   */
  async init(params: IUnificationParams): Promise<void> {
    Log.debug('Data Migration', 'Migrating');
    const filename = params.files[0];
    // if there is no or only file flag than proceed
    // if there is some value provided, than generate defaults and add them for values
    // TODO: change it later to handle mutliple files
    if (params.files.length > 1) {
      Log.warn('Unification', 'Please provide only one file.');
      return;
    }
    this.readLogs(filename);
    await this.fileReader.prepareLogs(this.logs.logs);
    await this.utils.promptMalformedLogDeletion();
    // in case of deleting malformed logs we need to read logs again to update them.
    this.readLogs(filename);

    if (!params.remove) {
      await this.generateDefaults(params);
    }
    if (params.remove) {
      await this.removeFields(params);
    }
    const file = this.fileController.fetchCurrentLogFile(filename);
    this.fileWriter.save(file, this.logs);
  }
  /**
   * Read logs from file.
   * @param fileName Name of a file.
   * @returns { void } Void.
   */
  private readLogs(fileName?: string): void {
    this.logs = this.fileReader.init(fileName);
  }

  private async removeFields(params: IUnificationParams): Promise<void> {
    if ('logs' in this.logs && typeof this.logs.logs === 'object') {
      const logEntries = Object.entries(this.logs.logs);
      const updatedLogs: [string, string][] = await Promise.all(
        logEntries.map(async ([key, value]) => {
          if (checkIfObject(value as string)) {
            const log = JSON.parse(value as string) as ILogEntry;
            for (const v in log) {
              if (params.values.includes(v as IUnifiactionKey)) {
                delete log[v as IUnifiactionKey];
              }
            }
            // Handle JSON object logs
            return [key, JSON.stringify(log)];
          }
          // Handle Protobuf logs
          const decodedEntry = await this.proto.decodeLogEntry(value as string);
          for (const v in decodedEntry) {
            if (params.values.includes(v as IUnifiactionKey)) {
              delete decodedEntry[v as IUnifiactionKey];
            }
          }
          const reEncodedEntry = await this.proto.encodeLog(decodedEntry);
          return [key, reEncodedEntry];
        }),
      );

      for (const [key, value] of updatedLogs) {
        this.logs.logs[key as keyof typeof this.logs.logs] = value;
      }
    }
  }
  /**
   * Applies default values to all logs.
   * @param params Unification params.
   * @returns {Promise<void>} Resolves when defaults are applied.
   * @async
   */
  private async generateDefaults(params: IUnificationParams): Promise<void> {
    if ('logs' in this.logs && typeof this.logs.logs === 'object') {
      const logEntries = Object.entries(this.logs.logs);
      const updatedLogs: [string, string][] = await Promise.all(
        logEntries.map(async ([key, value]) => {
          let entry: ILogEntry;

          if (checkIfObject(value as string)) {
            // Handle JSON object logs
            entry = this.applyDefaults(JSON.parse(value as string) as ILogEntry, params.values);
            return [key, JSON.stringify(entry)];
          }
          // Handle Protobuf logs
          const decodedEntry = await this.proto.decodeLogEntry(value as string);
          const updatedEntry = this.applyDefaults(decodedEntry, params.values);
          const reEncodedEntry = await this.proto.encodeLog(updatedEntry);
          return [key, reEncodedEntry];
        }),
      );

      for (const [key, value] of updatedLogs) {
        this.logs.logs[key as keyof typeof this.logs.logs] = value;
      }
    }
  }
  /**
   * Applies default values to a log entry.
   * @param entry The log entry to modify.
   * @param keys Fields to add default value to.
   * @returns {ILogEntry} The modified log entry with defaults applied.
   * @throws
   */
  private applyDefaults(entry: ILogEntry, keys?: IUnifiactionKey[]): ILogEntry | never {
    let log: ILogEntry;
    try {
      if (keys?.length === 0 || !keys) {
        log = {
          method: entry.method ? entry.method.trim() : 'GET',
          body: entry.body && Object.entries(entry.body as unknown as object).length > 0 ? entry.body : '{}',
          queryParams:
            entry.queryParams && Object.entries(entry.queryParams as unknown as object).length > 0
              ? entry.queryParams
              : JSON.stringify({ key: 'value' }),
          headers:
            entry.headers && Object.entries(entry.headers as unknown as object).length > 0
              ? entry.headers
              : JSON.stringify({ key: 'value' }),
          ip: entry.ip && entry.ip.length > 0 ? entry.ip : '::ffff:127.0.0.1',
          path: entry.path && entry.path.length > 0 ? entry.path : '',
          statusCode: entry.statusCode ? entry.statusCode : 200,
          occured: entry.occured ?? Date.now().toString(),
          duration: entry.duration ?? 0,
        };
      } else {
        log = {
          method: keys.includes('method') && !entry.method ? 'GET' : entry.method?.trim(),
          body: keys.includes('body') && (entry.body === null || !entry.body) ? '{}' : entry.body,
          queryParams:
            keys.includes('queryParams') && (entry.queryParams === null || !entry.queryParams)
              ? JSON.stringify({ key: 'value' })
              : entry.queryParams,
          headers:
            keys.includes('headers') && (entry.headers === null || !entry.headers)
              ? JSON.stringify({ key: 'value' })
              : entry.headers,
          ip: keys.includes('ip') && (!entry.ip || entry.ip.length === 0) ? '::ffff:127.0.0.1' : entry.ip,
          path: keys.includes('path') && (entry.path === null || !entry.path) ? '' : entry.path,
          statusCode:
            keys.includes('statusCode') && (entry.statusCode === null || !entry.statusCode) ? 200 : entry.statusCode,
          occured:
            keys.includes('occured') && (entry.occured === null || !entry.occured)
              ? Date.now().toString()
              : entry.occured,
          duration: entry.duration,
        };
      }
      return log;
    } catch (_error) {
      throw new ApplyingDefaultsError();
    }
  }
}
