import FileController from './controller.js';
import FileWriter from './writer.js';
import { defaultMiddlewareConfig, defaultToasterConfig } from '../../tools/config.js';
import Log from '../../tools/logger.js';
import State from '../../tools/state.js';
import Validation from '../../tools/validator.js';
import { checkIfObject } from '../../utils/index.js';
import Proto from '../protobuf/index.js';
import type {
  ILog,
  ILogEntry,
  ILogProto,
  ILogs,
  ILogsProto,
  INotFormattedLogEntry,
  IToasterTimeTravel,
} from '../../../types/index.js';
import fs from 'fs';
import path from 'path';

export default class FileReader {
  private _controller: FileController;
  _malformed: string[] = [];

  constructor() {
    this._controller = new FileController();
  }

  get malformed(): string[] {
    return this._malformed;
  }

  set malformed(value: string[]) {
    this._malformed = value;
  }

  private get controller(): FileController {
    return this._controller;
  }

  /**
   * Get default config for toaster.
   * @description Returns default config.
   * @returns {IToasterTimeTravel} Default configs.
   * @private
   */
  private static getDefaultConfig(): IToasterTimeTravel {
    return {
      port: 5003,
      countTime: false,
      logFileSize: 200,
      removeMalformed: false,
      waitUntillNextReq: 1000,
      inputBeforeNextReq: false,
    };
  }
  getMalformedLogs(): string[] {
    return this.malformed;
  }
  /**
   * Validate configs.
   * @description Validate time-travel config.
   * @param config User's config.
   * @returns {void} Void.
   * @async
   * @private
   */
  private static validateConfig(config: IToasterTimeTravel): void {
    Log.debug('Cli', 'Validating config');

    new Validation(config, 'config').isDefined().isObject();
    new Validation(config.port, 'config.port').isDefined().isNumber();
    if (config.countTime) new Validation(config.countTime, 'config.countTime').isDefined().isBoolean();
    if (config.path) new Validation(config.path, 'config.path').isDefined().isString();
    if (config.removeMalformed)
      new Validation(config.removeMalformed, 'config.removeMalformed').isDefined().isBoolean();
    if (config.waitUntillNextReq)
      new Validation(config.waitUntillNextReq, 'config.waitUntillNextReq').isDefined().isNumber();
    if (config.inputBeforeNextReq)
      new Validation(config.inputBeforeNextReq, 'config.inputBeforeNextReq').isDefined().isBoolean();
  }

  /**
   * Read application config.
   * @description Read time-travel config.
   * @returns {void} Void.
   * @async
   * @throws {Error} Throw new error whenever config is malformed.
   */
  static readConfig(): IToasterTimeTravel {
    Log.debug('Cli', 'Reading config');
    const defaultConfig: IToasterTimeTravel = FileReader.getDefaultConfig();
    const dirPath = process.cwd();

    FileWriter.validateFile('toaster.json', JSON.stringify(defaultConfig, null, 2), dirPath);

    if (!fs.existsSync(path.join(dirPath, 'toaster.json'))) {
      throw new Error('Missing toaster config');
    }

    try {
      const file = fs.readFileSync(path.join(dirPath, 'toaster.json'));
      const config = JSON.parse(file.toString()) as IToasterTimeTravel;
      FileReader.validateConfig(config);

      State.config = { ...defaultMiddlewareConfig() };
      State.toasterConfig = { ...defaultToasterConfig(), ...config };
      if (config.path) State.config.path = config.path;

      return config;
    } catch (_err) {
      throw new Error('Malformed toaster config');
    }
  }
  /**
   * Read temp log file.
   * @description Get list of files in temp log directory.
   * @returns {string[] | undefined} Returns list of files in tmp directory.
   * @throws
   */
  static readTmpLogs(): fs.Dirent[] | undefined {
    Log.debug('Log reader', 'Reading tmp logs');
    FileReader.checkFailedFile();

    try {
      const file = fs.readdirSync(path.resolve(State.config.path, 'tmp'), { withFileTypes: true });
      return file;
    } catch (_error) {
      Log.log('FileReader', 'No temp directory.');
      return undefined;
    }
  }

  /**
   * Check for failed log file.
   * @description Logs if failed.json is found.
   * @throws
   */
  static checkFailedFile(): void {
    Log.debug('Log reader', 'Reading failde directory');

    try {
      const file = fs.readdirSync(path.resolve(State.config.path, 'failed'), { withFileTypes: true });
      if (file.length > 0) {
        Log.warn(
          'FileReader',
          'Found failed.json. Run \n npx api-toaster time-travel -p path/to/failed/dir -f failed.json',
        );
      }
    } catch (_error) {
      // TODO: not needed ?
      Log.error('FileReader', 'Could not read failed directory');
    }
  }
  /**
   * Read logs files.
   * @description Get current or specified log file, read and return it for usage.
   * @param fileName Name of a file to be read.
   * @param srcPath Different path to a log file.
   * @returns {ILogs} Saved logs.
   */
  init(fileName?: string, srcPath?: string): ILogsProto | ILogs {
    Log.debug('Log reader', 'Initing');
    this.preRead();

    let file: string = '';
    if (srcPath && srcPath?.length > 0 && fileName) {
      file = fileName;
    } else {
      file = this.controller.fetchCurrentLogFile(fileName);
    }

    return this.controller.prepareLogfile(file, srcPath);
  }

  /**
   * Init basic files.
   * @description Initialize basic directories and files.
   * @returns {void} Void.
   */
  private preRead(): void {
    Log.debug('File reader', 'Pre');
    this.controller.initDirectories();
    if (!fs.existsSync(`${State.config.path}/logs_0.json`)) {
      try {
        fs.writeFileSync(`${State.config.path}/logs_0.json`, '');
      } catch (error) {
        Log.debug('File reader', (error as Error).message);
        Log.log('File reader', "Couldn't create new ");
      }
    }
  }
  /**
   * Preload load.
   * @description Preload log file.
   * @param fileName Target file.
   * @param srcPath Different path to a log file.
   * @returns {[string, INotFormattedLogEntry][]} Logs files.
   * @async
   */
  async preLoadLogs(fileName?: string, srcPath?: string): Promise<[string, INotFormattedLogEntry][]> {
    Log.debug('File reader', 'Preloading logs');

    const logs = this.init(fileName, srcPath);
    return this.prepareLogs(logs.logs);
  }
  /**
   * Submit data for user.
   * @description Submit data for user.
   * @param logs Read logs from file.
   * @returns {[string, INotFormattedLogEntry][]} Prepared logs.
   * @async
   * @private
   */
  async prepareLogs(logs: ILogProto | ILog): Promise<[string, INotFormattedLogEntry][]> {
    Log.debug('File reader', 'Preparing logs');

    const removeEmptyFields = (log: INotFormattedLogEntry): Partial<INotFormattedLogEntry> => {
      return Object.entries(log).reduce((acc, [key, value]) => {
        // Always include 'body', even if it's empty
        if (key === 'body') {
          if (value !== null && typeof value === 'object') {
            acc[key] = value as Record<string, unknown>;
          }
          return acc;
        }
        if (key === 'duration') {
          if (value !== null && typeof value === 'number') {
            acc[key] = value;
          }
          return acc;
        }
        // Type-specific checks for each key
        switch (key) {
          case 'queryParams':
          case 'headers':
            if (
              typeof value === 'object' &&
              value !== null &&
              Object.keys(value as Record<string, string>).length > 0
            ) {
              acc[key] = value as Record<string, string>;
            }
            break;
          case 'ip':
          case 'occured':
            if (typeof value === 'string' && value && value.trim() !== '') {
              acc[key] = value;
            }
            break;

          case 'statusCode':
            if (typeof value === 'number' && value) {
              acc[key] = value;
            }
            break;
          case 'method':
          case 'path':
            if (typeof value === 'string' && value && value.trim() !== '') {
              acc[key] = value;
            }
            break;
          default:
            break;
        }
        return acc;
      }, {} as Partial<INotFormattedLogEntry>);
    };

    const proto = new Proto();

    const prepared = await Promise.all(
      Object.entries(logs).map(async ([k, v]) => {
        let decodedLog: ILogEntry | INotFormattedLogEntry;
        const isObject = checkIfObject(v as string);
        if (isObject) {
          decodedLog = JSON.parse(v as string) as ILogEntry;
        } else {
          decodedLog = await proto.decodeLogEntry(v as string);
        }
        try {
          // Dynamically construct the log entry
          const result: INotFormattedLogEntry = {
            body: decodedLog.body as unknown as Record<string, unknown>,
            // typeof decodedLog.body === 'string'
            //   ? (JSON.parse(decodedLog.body) as Record<string, unknown>)
            //   : (decodedLog.body ?? {}),
            method: decodedLog.method,
            path: decodedLog.path,
            ip: decodedLog.ip,
            statusCode: decodedLog.statusCode,
            occured: decodedLog.occured,
            duration: decodedLog.duration,
          };
          // Conditionally include fields
          if (decodedLog.body) {
            result.body =
              typeof decodedLog.body === 'string'
                ? (JSON.parse(decodedLog.body) as Record<string, unknown>)
                : decodedLog.body;
          }
          if (decodedLog.queryParams) {
            if (typeof decodedLog.queryParams === 'string') {
              result.queryParams = JSON.parse(decodedLog.queryParams) as {
                [key: string]: undefined | string | string[];
              };
            } else {
              result.queryParams = decodedLog.queryParams;
            }
          }
          if (decodedLog.headers) {
            result.headers =
              typeof decodedLog.headers === 'string'
                ? (JSON.parse(decodedLog.headers) as Record<string, string | string[]>)
                : decodedLog.headers;
          }
          const newResult = removeEmptyFields(result);
          return [k, newResult];
        } catch (_err) {
          if (
            decodedLog.body &&
            typeof decodedLog.body === 'object' &&
            !Array.isArray(decodedLog.body) &&
            decodedLog.body !== null &&
            Object.keys(decodedLog.body).length > 0
          ) {
            Log.debug('File reader', `Log ${k} seems to be an object type instead of JSON type`);
            return [k, v] as unknown as [string, INotFormattedLogEntry];
          }

          this.malformed.push(k);
          return null;
        }
      }),
    );
    const filteredPrepared = prepared.filter((e) => e);

    Log.debug('File reader', 'Formatted logs', JSON.stringify(filteredPrepared));

    return filteredPrepared as [string, INotFormattedLogEntry][];
  }
}
