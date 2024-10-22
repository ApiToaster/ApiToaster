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
    this._logs = { logs: {} };
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
   * Save new log.
   * @description Prepare and save new log.
   * @param req {express.Request} Request received from user.
   * @param statusCode Response status code.
   * @returns {void} Void.
   */

  async init(req: express.Request, statusCode?: number): Promise<void> {
    Log.debug('File writer', 'Init');

    this.pre();
    this.currLogFile = this.controller.fetchCurrentLogFile();

    this.logs = this.controller.prepareLogfile(this.currLogFile);

    this.prepareIndexFile();
    this.prepareConfigFile();

    this.prepareConfig();
    if (State.config.disableProto) {
      this.prepareJsonLog(req, statusCode);
    } else {
      await this.prepareBufLog(req, statusCode);
    }
    this.checkFileSize(this.currLogFile);
    this.saveFiles();
  }

  /**
   * Init basic files.
   * @description Initialize basic directories and files.
   * @returns {void} Void.
   */
  private pre(): void {
    Log.debug('File writer', 'Pre');
    this.controller.initDirectories();
    this.validateFile('index.json', JSON.stringify({ indexes: {} }));
    this.validateFile(this.currLogFile, JSON.stringify({ logs: {} }));
    this.validateFile('config.json', JSON.stringify({ disableProto: false }));
  }

  /**
   * Prepare new log.
   * @description Prepare new log and index it.
   * @param req {express.Request} Request received from user.
   * @param statusCode Response status code.
   * @returns {void} Void.
   * @private
   */
  private async prepareBufLog(req: express.Request, statusCode?: number): Promise<void> {
    Log.debug('File writer', 'Prepare buf log');

    const uuid = randomUUID() as string;
    const proto = new Proto();

    const logBody = this.prepareLog(req, statusCode);

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
   * @param statusCode Response status code.
   * @returns {void} Void.
   * @private
   */
  private prepareJsonLog(req: express.Request, statusCode?: number): void {
    Log.debug('File writer', 'Prepare json log');

    const uuid = randomUUID() as string;

    const logBody = this.prepareLog(req, statusCode);

    const logProto: ILogProto = {
      [uuid]: JSON.stringify(logBody),
    };

    this.currLogSize = Buffer.byteLength(JSON.stringify(logProto));
    this.logs.logs = { ...(this.logs.logs as ILogProto), ...logProto };
    this.index.indexes[uuid] = path.resolve(State.config.path, this.currLogFile);
  }

  /**
   * Prepare new generic log body.
   * @description Preapre new generic log body.
   * @param req {express.Request} Request received from user.
   * @param statusCode Response status code.
   * @returns {void} Void.
   * @private
   */
  private prepareLog(req: express.Request, statusCode?: number): INotFormattedLogEntry {
    Log.debug('File writer', 'Prepare log');

    const filteredHeaders = { ...req.headers };

    delete filteredHeaders['content-length'];

    const body: INotFormattedLogEntry = {
      method: State.config.method ? req.method : undefined,
      body: State.config.body ? ((req.body ?? {}) as Record<string, unknown>) : {},
      queryParams: State.config.queryParams ? (req.query as Record<string, string>) : {},
      headers: State.config.headers ? filteredHeaders : {},
      ip: State.config.ip ? req.ip : undefined,
      statusCode: State.config.statusCode ? statusCode : undefined,
      occured: Date.now(),
    };
    this.obfuscate(body);

    const logBody: INotFormattedLogEntry = {
      ...body,
      occured: body.occured,
      queryParams: body.queryParams,
      headers: body.headers,
    };

    return logBody;
  }

  /**
   * Prepare new buffed log body.
   * @description Preapre new generic buffed log body.
   * @param log {INotFormattedLogEntry} Not formated log.
   * @returns {ILogEntry} Preapred log entry.
   * @private
   */
  private prepareBuffedLog(log: INotFormattedLogEntry): ILogEntry {
    Log.debug('File writer', 'Preapre buffed log');
    const formated: ILog['body'] = {
      body: JSON.stringify(log.body),
      method: log.method,
      occured: new Date(log.occured).toISOString(),
      queryParams: JSON.stringify(log.queryParams),
      headers: JSON.stringify(log.headers),
      ip: log.ip,
    };
    return formated;
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
   * Validate and create files.
   * @description Validate and create files with base validates if they do not exist.
   * @param target File to validate.
   * @param baseBody File's body to initialize.
   * @returns {void} Void.
   * @private
   */
  private validateFile(target: string, baseBody: string): void {
    Log.debug('File writer', 'Validate file');
    const location = path.resolve(State.config.path, target);

    try {
      if (!fs.existsSync(location)) {
        fs.writeFileSync(location, baseBody);
      }
    } catch (err) {
      Log.error('File reader', `Cannot create ${target} file`, (err as Error).message);
    }
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

    const logPath = path.resolve(State.config.path, logName);
    const size = fs.statSync(logPath).size + this.currLogSize;
    if (size > 50000000000) {
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
    this.logs.logs = { ...Object.fromEntries(lastLog) };
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
}
