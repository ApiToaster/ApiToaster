import FileReader from './module/files/reader.js';
import FileWriter from './module/files/writer.js';
import { defaultMiddlewareConfig, defaultToasterConfig } from './tools/config.js';
import Log from './tools/logger.js';
import State from './tools/state.js';
import type { IToasterConfig } from '../types';
import type express from 'express';
import { randomUUID } from 'crypto';
import path from 'path';

class Toaster {
  private _fileWriter: FileWriter;
  constructor() {
    this._fileWriter = new FileWriter();
  }

  public get fileWriter(): FileWriter {
    return this._fileWriter;
  }

  public set fileWriter(value: FileWriter) {
    this._fileWriter = value;
  }

  /**
   * Initialize application.
   * @description Initialize application to save logs.
   * @param req {express.Request} Request received from user.
   * @param statusCode {express.Response.statusCode} statusCode send by server.
   * @returns {void} Void.
   * @async
   */
  async init(req: express.Request, statusCode?: number): Promise<void> {
    Log.log('Main action', 'Initing');
    const shouldSave = this.shouldSave(req);

    if (shouldSave) {
      await this.fileWriter.init(req, statusCode);
    }
  }

  /**
   * Pre initialize application.
   * @description Pre initialize application by generating all configs. This is seperated from default init, because I want to initialize configs before running main app.
   * @param config {IToasterConfig} Application config.
   * @returns {void} Void.
   */
  preInit(config?: IToasterConfig): void {
    // check for pre exisiting temp files .
    this.initPath(config);
    this.checkForExistingTempFiles();
    this.initUuid();
  }

  private initUuid(): void {
    State.reqUuid = randomUUID();
  }

  initTemp(req: express.Request): void {
    this.fileWriter.tempInit(req);
  }

  private checkForExistingTempFiles(): void {
    const tmpFiles = FileReader.readTmpLogs();
    if (tmpFiles && tmpFiles.length > 0) {
      Log.log('ApiToaster', 'Found tmp files. Server probably was shutdown ungracefuly.');
    }
  }

  deleteTmp(id: string): void {
    this.fileWriter.deleteTmpLog(id);
  }
  /**
   * Initialize path.
   * @description Prepare application and initialize its path.
   * @param config {IToasterConfig} Toaster's config.
   * @returns {void} Void.
   * @private
   */
  private initPath(config?: IToasterConfig): void {
    const toasterConfig = FileReader.readConfig();
    State.toasterConfig = { ...defaultToasterConfig(), ...toasterConfig };
    if (
      config &&
      typeof config === 'object' &&
      !Array.isArray(config) &&
      config !== null &&
      Object.keys(config).length > 0
    ) {
      Log.log('Main action', 'User provided config');
      if (config.path) {
        const root = process.cwd();
        const str = config.path.startsWith('/') ? config.path.slice(1) : config.path;
        const dirPath = path.resolve(root, str);
        State.config = { ...defaultMiddlewareConfig(), ...config, path: dirPath };
      } else {
        State.config = { ...defaultMiddlewareConfig(), ...config };
      }
    } else {
      Log.log('Main action', 'User did not provide config');

      State.config = defaultMiddlewareConfig();
    }
  }

  private shouldSave(req: express.Request): boolean {
    return req.headers?.['x-toaster'] === undefined;
  }
}

/**
 * Main function to handle logging.
 * @description Default function used to handle req logging and much more.
 * @param req Express request.
 * @param res Express response.
 * @param next Express next.
 * @param config Config used for logging middleware.
 * @default
 */
export default function (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
  config?: IToasterConfig,
): void {
  const toaster = new Toaster();
  toaster.preInit(config);
  toaster.initTemp(req);

  if (State.toasterConfig.countTime) {
    Log.time(State.reqUuid, 'Counting time for req');
    res.once('finish', () => {
      Log.endTime(State.reqUuid, 'Request finished');
    });
  }

  res.once('finish', () => {
    toaster
      .init(req, res.statusCode)
      .then(() => {
        toaster.deleteTmp(State.reqUuid);
      })
      .catch((err) => {
        Log.error('Main action', 'Got error', (err as Error).message);
        State.reqUuid = null;
      });
  });
  next();
}
