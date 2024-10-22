import { MissingCoreStructureError, NoSavedLogsError, MalformedLogFilesError } from '../../errors/index.js';
import Log from '../../tools/logger.js';
import State from '../../tools/state.js';
import type { ILogs, ILogsProto } from '../../../types/logs.js';
import fs from 'fs';
import path from 'path';

export default class FileController {
  /**
   * Initialize location.
   * @description  Initialize directories and files on given path.
   * @returns {void} Void.
   */
  initDirectories(): void {
    Log.debug('File reader', 'Initing directories');
    const dirPath = State.config.path;

    if (!fs.existsSync(dirPath)) {
      Log.debug('File reader', 'Path does not exist. Creating one');

      try {
        fs.mkdirSync(dirPath, { recursive: true });
      } catch (error) {
        Log.error('File reader', 'Error while making logs directory', error);
      }
    }
  }

  /**
   * Get current number of a log file.
   * @description Get the current log file as a highest numeration or passed filename.
   * @param fileName Name of a file to be read.
   * @returns {string} File to use.
   * @throws {MissingCoreStructureError} Eror whenever files or folder structure is missing and shouldThrow in config is set to true.
   */
  fetchCurrentLogFile(fileName?: string): string {
    Log.debug('File reader', 'Fetching log file');
    if (fileName) {
      try {
        fs.readFileSync(path.resolve(State.config.path, fileName));
      } catch (err) {
        Log.debug('File reader', 'Got error while reading provided file', (err as Error).message, (err as Error).stack);
        if (State.config.shouldThrow) throw new NoSavedLogsError();
      }

      return fileName;
    }

    Log.log('File reader', 'File target was not provided, selecting latest available file');
    let files: string[] = [];

    try {
      files = fs.readdirSync(State.config.path).filter((f) => f.includes('logs'));
    } catch (err) {
      Log.debug(
        'File reader',
        'Got error while  reading folder structure',
        (err as Error).message,
        (err as Error).stack,
      );
      if (State.config.shouldThrow) throw new MissingCoreStructureError();
    }

    const logNumbers = (files ?? [])
      .map((file) => {
        const match = file.match(/\d+/u);
        return match ? parseInt(match[0], 10) : null;
      })
      .filter((num): num is number => num !== null);

    if (logNumbers.length === 0) {
      Log.error('File reader', 'Number of log files is 0');
      if (State.config.shouldThrow) throw new NoSavedLogsError();
    }

    const max = Math.max(...logNumbers);

    Log.debug('File reader', `Default file is ${`logs_${max}.json`}`);

    return `logs_${max}.json`;
  }

  /**
   * Prepare protobuf log files.
   * @description Read, validate and prepare log files.
   * @param fileName Target file name.
   * @returns {ILogsProto} Logs.
   * @throws {NoSavedLogsError} Throw error if req comes from reader and shouldThrow in config is set to true.
   */
  prepareLogfile(fileName: string): ILogsProto | ILogs {
    Log.debug('File reader', 'Preparing log file');

    try {
      const log = path.resolve(State.config.path, fileName);
      const data = fs.readFileSync(log).toString();
      const file = JSON.parse(data) as ILogsProto | ILogs;

      if (file?.logs) {
        return file;
      }

      Log.warn('File reader', 'Log file seems to be malformatted. Will replace it on next save');
      return file ?? { logs: {} };
    } catch (error) {
      Log.warn('File reader', 'Got error while parsing data', (error as Error).message);
      if (State.config.shouldThrow) {
        throw new MalformedLogFilesError(fileName);
      }
      return { logs: {} };
    }
  }
}
