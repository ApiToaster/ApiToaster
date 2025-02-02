import FileController from './controller.js';
import Log from '../../tools/logger.js';
import State from '../../tools/state.js';
import Proto from '../protobuf/index.js';
import type {
  IPreviousSettings,
  IIndex,
  ILog,
  ILogEntry,
  ILogProto,
  ILogs,
  ILogsProto,
  INotFormattedLogEntry,
} from '../../../types/index.js';
import type express from 'express';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

export default class FileWriter {
  private _controller: FileController;
  private _logs: ILogsProto | ILogs;
  private _index: IIndex;
  private _config: IPreviousSettings;
  private _currLogSize: number = 0;
  private _currLogFile: string = 'logs_0.json';

  constructor() {
    this._controller = new FileController();
    this._logs = { meta: { logCount: 0 }, logs: {} };
    this._index = { indexes: {} };
    this._config = { disableProto: false };
  }

  private get logs(): ILogsProto | ILogs {
    return this._logs;
  }

  private set logs(val: ILogsProto | ILogs) {
    this._logs = val;
  }

  private get index(): IIndex {
    return this._index;
  }

  private set index(val: IIndex) {
    this._index = val;
  }

  public get config(): IPreviousSettings {
    return this._config;
  }

  public set config(value: IPreviousSettings) {
    this._config = value;
  }

  private get currLogSize(): number {
    return this._currLogSize;
  }

  private set currLogSize(val: number) {
    this._currLogSize = val;
  }

  private get currLogFile(): string {
    return this._currLogFile;
  }

  private set currLogFile(val: string) {
    this._currLogFile = val;
  }

  private get controller(): FileController {
    return this._controller;
  }

  /**
   * Validate and create files.
   * @description Validate and create files with base validates if they do not exist.
   * @param target File to validate.
   * @param baseBody File's body to initialize.
   * @param dirPath Directory path.
   * @returns {void} Void.
   * @private
   */
  static validateFile(target: string, baseBody: string, dirPath: string): void {
    Log.debug('File writer', 'Validate file');
    const location = path.resolve(dirPath, target);

    try {
      if (!fs.existsSync(location)) {
        fs.writeFileSync(location, baseBody);
      }
    } catch (err) {
      Log.error('File reader', `Cannot create ${target} file`, (err as Error).message);
    }
  }
  /**
   * Copy file to location.
   * @param src {string}.
   * @param dest {string}.
   * @returns {void} Void.
   * @throws
   */
  copyLogs(src: string, dest: string): void {
    Log.debug('File writer', 'Copying file.');

    // TODO: after copy to failed dest, erase temp
    // make it accessible for all commands perhaps ?
    // for sure time travel has to has an access.
    // make it removable
    // also create method to remove normal logs maybe ?
    // maybe create some rotation mechanism to erase logs ?
    try {
      const file = fs.readFileSync(src);
      const log: ILogProto = JSON.parse(file.toString()) as ILogProto;
      this.logs.logs = { ...(this.logs.logs as ILogProto), ...log };
      const logs = {
        logs: this.logs.logs,
      };
      const destFilePath = path.resolve(dest, 'failed.json');
      fs.writeFileSync(destFilePath, JSON.stringify(logs, null, 2));
      fs.rmSync(src);
    } catch (_err) {
      throw new Error('Copying file failed.');
    }
  }
  /**
   * Save new log.
   * @description Prepare and save new log.
   * @param req {express.Request} Request received from user.
   * @param statusCode Response status code.
   * @returns {void} Void.
   */

  async init(req: express.Request, duration: number, statusCode?: number): Promise<void> {
    Log.debug('File writer', 'Init');

    this.pre();
    this.currLogFile = this.controller.fetchCurrentLogFile();

    this.logs = this.controller.prepareLogfile(this.currLogFile);

    this.updateLogCount();

    this.prepareIndexFile();
    this.prepareConfigFile();

    this.prepareConfig();
    if (State.config.disableProto) {
      this.prepareJsonLog(req, duration, statusCode);
    } else {
      await this.prepareBufLog(req, duration, statusCode);
    }
    this.checkFileSize(this.currLogFile);
    this.saveFiles();
  }

  /**
   * Save temp log.
   * @description Prepare and save temp log.
   * @param req {express.Request} Request received from user.
   * @returns {void} Void.
   */

  tempInit(req: express.Request): void {
    Log.debug('File writer', 'Init');

    this.controller.initDirectories();

    this.prepareJsonLog(req, 0);
    this.save(`tmp/${State.reqUuid}.json`, this.logs.logs);
  }

  /**
   * Init basic files.
   * @description Initialize basic directories and files.
   * @returns {void} Void.
   */
  private pre(): void {
    Log.debug('File writer', 'Pre');
    this.controller.initDirectories();

    const filePath = State.config.path;
    FileWriter.validateFile('index.json', JSON.stringify({ indexes: {} }), filePath);
    FileWriter.validateFile(this.currLogFile, JSON.stringify({ meta: { logCount: 0 }, logs: {} }), filePath);
    FileWriter.validateFile('config.json', JSON.stringify({ disableProto: false }), filePath);
  }

  /**
   * Prepare new log.
   * @description Prepare new log and index it.
   * @param req {express.Request} Request received from user.
   * @param duration Request duration time.
   * @param statusCode Response status code.
   * @returns {void} Void.
   * @private
   */
  private async prepareBufLog(req: express.Request, duration: number, statusCode?: number): Promise<void> {
    Log.debug('File writer', 'Prepare buf log');

    const uuid = State.reqUuid ?? randomUUID();
    const proto = new Proto();

    const logBody = this.prepareLog(req, duration, statusCode);

    logBody.occured = logBody.occured?.toString();

    const buffedLog = this.prepareBuffedLog(logBody);

    const logProto: ILogProto = {
      [uuid]: await proto.encodeLog(buffedLog),
    };

    this.currLogSize = Buffer.byteLength(JSON.stringify(logProto));
    this.logs.logs = { ...(this.logs.logs as ILogProto), ...logProto };
    this.index.indexes[uuid] = path.resolve(State.config.path, this.currLogFile);
  }

  /**
   * Prepare new log json.
   * @description Preapre new json log and index it.
   * @param req {express.Request} Request received from user.
   * @param duration Request duration time.
   * @param statusCode Response status code.
   * @returns {void} Void.
   * @private
   */
  private prepareJsonLog(req: express.Request, duration: number, statusCode?: number): void {
    Log.debug('File writer', 'Prepare json log');

    const uuid = State.reqUuid ?? randomUUID();

    const logBody = this.prepareLog(req, duration, statusCode);

    logBody.occured = logBody.occured?.toString();

    const logProto: ILogProto = {
      [uuid]: JSON.stringify(logBody),
    };
    // TODO: currLogSize is not used anymore i think
    this.currLogSize = Buffer.byteLength(JSON.stringify(logProto));
    this.logs.logs = { ...(this.logs.logs as ILogProto), ...logProto };
    this.index.indexes[uuid] = path.resolve(State.config.path, this.currLogFile);
  }

  private isEmptyObject(value: unknown): boolean {
    return typeof value === 'object' && value !== null && Object.keys(value).length === 0;
  }
  /**
   * Prepare new generic log body.
   * @description Preapre new generic log body.
   * @param req {express.Request} Request received from user.
   * @param duration Request duration time.
   * @param statusCode Response status code.
   * @returns {void} Void.
   * @private
   */
  private prepareLog(req: express.Request, duration: number, statusCode?: number): INotFormattedLogEntry {
    Log.debug('File writer', 'Prepare log');

    const filteredHeaders = { ...req.headers };

    delete filteredHeaders['content-length'];

    const body: INotFormattedLogEntry = {
      method: State.config.method ? req.method : undefined,
      body: State.config.body ? ((req.body ?? {}) as Record<string, unknown>) : {},
      queryParams: State.config.queryParams ? ((req.query as Record<string, string>) ?? {}) : {},
      path: State.config.path ? req.path : '',
      headers: State.config.headers ? filteredHeaders : {},
      ip: State.config.ip ? req.ip : undefined,
      statusCode: State.config.statusCode ? statusCode : undefined,
      occured: Date.now().toString(),
      duration,
    };

    this.obfuscate(body);
    return this.filterEmptyFields(body);
  }

  /**
   * Prepare new buffed log body.
   * @description Prepare new generic buffed log body.
   * @param log {INotFormattedLogEntry} Not formated log.
   * @returns {ILogEntry} Preapred log entry.
   */
  prepareBuffedLog(log: INotFormattedLogEntry): ILogEntry {
    Log.debug('File writer', 'Prepare buffed log');

    const formatted: ILog['body'] = {
      body: JSON.stringify(log.body),
      method: log.method,
      occured: log.occured,
      path: log.path,
      queryParams: JSON.stringify(log.queryParams),
      headers: JSON.stringify(log.headers),
      ip: log.ip,
      statusCode: log.statusCode,
      duration: log.duration,
    };

    const filteredLog = this.filterEmptyFields(formatted);
    return filteredLog;
  }

  /**
   * Filters out empty fields from the given object, leaving `body` intact even if empty.
   * @param entry The log entry to filter.
   * @returns The filtered log entry.
   */
  private filterEmptyFields<T extends { body: unknown }>(entry: T): T {
    return Object.entries(entry).reduce(
      (acc, [key, value]) => {
        if (key === 'body') {
          acc.body = entry.body; // Always include `body`, even if empty
        } else if (value !== undefined && value !== null && value !== '' && !this.isEmptyObject(value)) {
          (acc as Record<string, unknown>)[key] = value;
        }
        return acc;
      },
      { body: entry.body } as T,
    );
  }
  /**
   * Prepare and update conig state.
   * @description Updates field disableProto in state.
   * @returns {void} Void.
   * @private
   */
  private prepareConfig(): void {
    Log.debug('File writer', 'Preapre config');
    this.config.disableProto = State.config.disableProto;
  }

  /**
   * Save generic data.
   * @description Save generic data to files.
   * @param fileName Name of the file to be saved.
   * @param content Content to be saved.
   * @returns {void} Void.
   */
  save(fileName: string, content: unknown): void {
    const location = path.resolve(State.config.path, fileName);

    try {
      fs.writeFileSync(location, JSON.stringify(content, null, 2));
    } catch (error) {
      Log.error('File writer', 'Save File', error);
    }
  }

  /**
   * Save data.
   * @description Save prepared data to files.
   * @returns {void} Void.
   * @private
   */
  private saveFiles(): void {
    this.incrementLogCount();
    this.save('index.json', this.index);
    this.save(this.currLogFile, this.logs);
    this.save('config.json', this.config);
  }

  /**
   * Prepare index files.
   * @description Read, validate and prepare index files.
   * @returns {void} Void.
   * @private
   */
  private prepareIndexFile(): void {
    Log.debug('File writer', 'Preparing index');
    const location = path.resolve(State.config.path, 'index.json');

    try {
      const data = fs.readFileSync(location).toString();
      this.index = JSON.parse(data) as IIndex;
    } catch (error) {
      Log.error('File writer', 'Got error while parsing indexes', (error as Error).message);
      this.index = { indexes: {} };
    }
  }
  /**
   * Preapre config file.
   * @description Read, validate and prepare config file.
   * @returns {void} Void.
   * @private
   */
  private prepareConfigFile(): void {
    Log.debug('File writer', 'Preapring config');
    const location = path.resolve(State.config.path, 'config.json');

    try {
      const data = fs.readFileSync(location).toString();
      this.config = JSON.parse(data) as IPreviousSettings;
    } catch (error) {
      Log.error('File reader', 'Got error while parsing config', (error as Error).message);
      this.config = { disableProto: false };
    }
  }

  /**
   * Obfuscate parameters from requests.
   * @description Method to obfuscate provided in config fields.
   * @param log Single log.
   * @returns {void} Void.
   * @private
   */
  private obfuscate(log: INotFormattedLogEntry): void {
    Log.debug('File writer', 'Obfuscating');
    State.config.obfuscate
      .filter((field) => field !== 'occured')
      .forEach((e) => {
        if (log.body[e]) log.body[e] = '***';
      });
  }

  /**
   * Check for a file size.
   * @description Method to check for combined current file and element to be saved size.
   * @param logName Log file path name.
   * @returns {void} Void.
   * @private
   */
  private checkFileSize(logName: string): void {
    Log.debug('File writer', 'Checking file size');

    const size = this.logs.meta.logCount;

    if (size >= State.toasterConfig.logFileSize) {
      this.incrementLogFile(logName);
      this.cleanLogs();
    }
  }

  /**
   * Clean logs object.
   * @description Method to clean previous logs and keep last one.
   * @returns {void} Void.
   * @private
   */
  private cleanLogs(): void {
    Log.debug('File writer', 'Cleaning logs');

    const lastLog = Object.entries(this.logs.logs).slice(-1);
    this.logs.meta.logCount = 0;
    this.logs.logs = { ...Object.fromEntries(lastLog) };
  }

  /**
   * Reset curr log number.
   * @description Method to reset current log counter.
   * @returns {void} Void.
   * @private
   */
  resetLogCount(): void {
    Log.debug('File writer', 'Reseting log count');

    this.currLogFile = 'logs_0.json';
  }

  /**
   * Delete logs.
   * @description Method to delete logs with id.
   * @param logs Log id.
   * @returns {void} Void.
   * @private
   */
  deleteLog(logs: string[]): void {
    if (!logs || logs.length === 0) {
      Log.warn('File writer', 'No logs provided to delete.');
    }
    let modifiedData: ILogs | ILogsProto;
    let modifiedIndexData: IIndex;
    logs.forEach((log) => {
      Log.debug('File writer', `Deleting log ${log}`);
      const indexName = 'index.json';
      const fileName = this.controller.findLog(log, 'index.json');
      if (!fileName) {
        return;
      }
      const indexLocation = path.resolve(State.config.path, indexName);
      const indexData = JSON.parse(fs.readFileSync(indexLocation, 'utf8').toString()) as IIndex;

      const location = path.resolve(State.config.path, fileName);
      const data = JSON.parse(fs.readFileSync(location, 'utf8').toString()) as ILogs | ILogsProto;
      if (data.logs[log]) {
        delete data.logs[log];
        Log.log('File writer', `Log ${log} deleted from data.`);
      } else {
        Log.warn('File writer', `Log ${log} not found in ${fileName}.`);
      }
      if (indexData.indexes[log]) {
        delete indexData.indexes[log];
        Log.debug('File writer', `Log ${log} deleted from index.`);
      } else {
        Log.warn('File writer', `Log ${log} not found in index.`);
      }
      modifiedIndexData = indexData;
      modifiedData = data;
      this.logs = modifiedData;
      this.save(fileName, modifiedData);
      this.save(indexLocation, modifiedIndexData);
    });
  }
  /**
   * Delete temp log.
   * @description Method to delete tmp log with id.
   * @param id Logs id.
   * @returns {void} Void.
   * @throws
   */
  deleteTmpLog(id: string): void {
    const location = path.resolve(State.config.path, `tmp/${id}.json`);
    try {
      if (!fs.existsSync(location)) {
        throw new Error('Tmp file does not exist.');
      }
      fs.rmSync(location);
    } catch (_error) {
      throw new Error('Could not delete tmp file');
    }
  }
  /**
   * Increments log numeration.
   * @description Method to increment log file numeration.
   * @param logName Log file path name.
   * @returns {void} Void.
   * @private
   */
  private incrementLogFile(logName: string): void {
    Log.debug('File writer', 'Incrementing log file');

    const match = logName.match(/(\d+)/u);

    if (!match || match.length === 0) {
      Log.error('FileReader', 'Malformed file name.');
    }

    const number = parseInt(match![0], 10) + 1;
    this.currLogFile = logName.replace(/\d+/u, number.toString());
  }

  /**
   * Increments log count .
   * @description Method to increment log count.
   * @returns {void} Void.
   * @private
   */
  private incrementLogCount(): void {
    Log.debug('File writer', 'Incrementing log count');
    this.logs.meta.logCount++;
  }
  /**
   * Updates log count .
   * @description Method to update log count.
   * @returns {void} Void.
   * @private
   */
  private updateLogCount(): void {
    Log.debug('File writer', 'Updating log count');
    this.logs.meta.logCount = Object.keys(this.logs.logs).length;
  }
}
