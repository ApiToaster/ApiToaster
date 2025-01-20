import Log from '../../tools/logger.js';
import State from '../../tools/state.js';
import type FileReader from '../files/reader.js';
import type FileWriter from '../files/writer.js';
import readline from 'readline';

export default class Utils {
  private readonly _fileWriter: FileWriter;
  private readonly _fileReader: FileReader;

  constructor(reader: FileReader, writer: FileWriter) {
    this._fileWriter = writer;
    this._fileReader = reader;
  }

  private get writer(): FileWriter {
    return this._fileWriter;
  }

  private get reader(): FileReader {
    return this._fileReader;
  }

  /**
   * Prompts the user to delete malformed log entries if any are found.
   *
   * This function checks for malformed logs using the `reader` instance.
   * If malformed logs exist and automatic deletion is enabled in the configuration,
   * they are deleted immediately. Otherwise, the user is prompted to confirm deletion.
   *
   * - If the user confirms, the logs are deleted.
   * - If the user declines, the logs are retained.
   *
   * @returns {Promise<void>} Resolves when the deletion process (automatic or manual) is completed.
   * @throws {Error} If an issue occurs during log retrieval or deletion.
   * @example
   * // Example usage:
   * await fileFinderInstance.promptMalformedLogDeletion();
   *
   */
  async promptMalformedLogDeletion(): Promise<void> {
    const malformed = this.reader.getMalformedLogs();
    if (malformed.length > 0) {
      Log.warn('File finder', 'Found malformed logs. Prompting user for action.');

      if (State.toasterConfig.removeMalformed) {
        Log.log('Utils', 'Deleting automaticaly malformed logs...');
        this.writer.deleteLog(malformed);
        return;
      }

      const shouldDelete = await new Promise<boolean>((resolve) => {
        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        rl.question('\nFound malformed logs. Do you want to delete them from the file? (Y/N): ', (answer) => {
          rl.close();
          resolve(answer.trim().toUpperCase() === 'Y');
        });
      });

      if (shouldDelete) {
        Log.log('File finder', 'Deleting malformed logs...');
        this.writer.deleteLog(malformed);
      } else {
        Log.log('File finder', 'Skipping deletion of malformed logs.');
      }
    }
  }
}
