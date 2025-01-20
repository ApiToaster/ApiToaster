import FinderQueryBuilder from './querybuilders/finderQueryBuilder.js';
import UniQueryBuilder from './querybuilders/unificationQueryBuilder.js';
import * as enums from '../enums/index.js';
import Decoder from '../module/decode/index.js';
import FileFinder from '../module/files/finder.js';
import FileReader from '../module/files/reader.js';
import Migration from '../module/migration/index.js';
import TimeTravel from '../module/timeTravel/index.js';
import Unification from '../module/unification/index.js';
import Log from '../tools/logger.js';
import type { ICliArgs } from '../../types/index.js';

export default class Cli {
  private readonly _decoder: Decoder;
  private readonly _migration: Migration;

  constructor() {
    this._decoder = new Decoder();
    this._migration = new Migration();
  }

  private get decoder(): Decoder {
    return this._decoder;
  }

  private get migration(): Migration {
    return this._migration;
  }

  /**
   * Start cli.
   * @description Start cli and validate user's input.
   * @returns {void} Void.
   * @async
   */
  async handleInit(): Promise<void> {
    Log.debug('Cli', 'Initting');
    Log.logAll();

    const args = process.argv.splice(2) as ICliArgs;

    if (args.length === 0) {
      return Log.error('Cli', enums.ECliResponses.Default);
    }

    const command = args[0];

    switch (command) {
      case enums.ECliOptions.TimeTravel:
        return this.handleTimeTravel(args.slice(1));
      case enums.ECliOptions.Decode:
        return this.handleDecode(args.slice(1));
      case enums.ECliOptions.Migrate:
        return this.handleMigrate(args.slice(1));
      case enums.ECliOptions.Find:
        return this.handleFind(args.slice(1));
      case enums.ECliOptions.Unification:
        return this.handleUnificate(args.slice(1));
      case enums.ECliFlags.Help:
        return Log.log('Cli', enums.ECliResponses.Help);
      default:
        return Log.error('Cli', 'Provided unknown params. Use --help');
    }
  }

  /**
   * Start decodding.
   * @description Start decodding files.
   * @param args User's params.
   * @returns {void} Void.
   * @async
   * @private
   */
  private async handleDecode(args: ICliArgs): Promise<void> {
    Log.debug('Cli', 'Handeling decode');

    FileReader.readConfig();

    const flag = args[0];
    const target = args[1];

    switch (flag) {
      case enums.ECliFlags.Path:
      case enums.ECliFlags.ShortPath:
        !target ? Log.error('Cli', 'Please provide file to decode.') : await this.decode(target);
        break;
      case enums.ECliFlags.SaveDecoded:
      case enums.ECliFlags.ShortSaveDecoded:
        await this.saveDecoded(target);
        break;
      case enums.ECliFlags.Help:
      case enums.ECliFlags.ShortHelp:
        Log.log('Cli', enums.ECliResponses.DecodeHelp);
        break;
      case undefined:
      case null:
        await this.decode();
        break;
      default:
        Log.error('Cli', 'Unknown parameter.', enums.ECliResponses.DecodeUnknownCommand);
        break;
    }
  }

  /**
   * Start migrating.
   * @description Migrate logs json/proto.
   * @param args User's params.
   * @returns {void} Void.
   * @async
   * @private
   */
  private async handleMigrate(args: ICliArgs): Promise<void> {
    Log.debug('Cli', 'Handling migration');

    const flag = args[0];
    const target = args[1];
    const logFormat = args[2] as enums.ECliFlags.FormatJson | enums.ECliFlags.FormatProto;

    switch (flag) {
      case enums.ECliFlags.Path:
      case enums.ECliFlags.ShortPath:
        !target || !logFormat
          ? Log.error('Cli', 'Please provide file to decode and target format.')
          : await this.migrate(target, logFormat);
        break;
      case enums.ECliFlags.Help:
      case enums.ECliFlags.ShortHelp:
        Log.log('Cli', enums.ECliResponses.MigrateHelp);
        break;
      default:
        // TODO: change response
        Log.error('Cli', 'Unknown parameter.', enums.ECliResponses.MigrateUnknownCommand);
        break;
    }
  }
  /**
   * Start time travel.
   * @description Start time travel session.
   * @param args User's params.
   * @returns {void} Void.
   * @async
   * @private
   */
  private async handleTimeTravel(args: ICliArgs): Promise<void> {
    Log.debug('Cli', 'Handling time travel');
    FileReader.readConfig();
    if (args[0] === enums.ECliFlags.Help || args[0] === enums.ECliFlags.ShortHelp) {
      Log.log('Cli', enums.ECliResponses.TimeTravelHelp);
    } else {
      const builder = new FinderQueryBuilder(args);
      const params = builder.init();

      await new TimeTravel().init(params);
    }
    return undefined;
  }

  /**
   * Start finding files.
   * @description Search for selected files.
   * @param args User's params.
   * @returns {void} Void.
   * @async
   * @private
   */
  private async handleFind(args: ICliArgs): Promise<void> {
    Log.debug('Cli', 'Handeling find');

    FileReader.readConfig();
    if (args[0] === enums.ECliFlags.Help || args[0] === enums.ECliFlags.ShortHelp) {
      Log.log('Cli', enums.ECliResponses.FindHelp);
    } else {
      const builder = new FinderQueryBuilder(args);
      const params = builder.init();

      if (builder.isEmpty()) return Log.error('Cli', 'Malformed params');

      await new FileFinder().find(params);
    }
    return undefined;
  }

  /**
   * Start unificate log file.
   * @description Unificate log files.
   * @param args User's params.
   * @returns {void} Void.
   * @async
   * @private
   */
  private async handleUnificate(args: ICliArgs): Promise<void> {
    Log.debug('Cli', 'Handling unification');

    FileReader.readConfig();

    if (args[0] === enums.ECliFlags.Help || args[0] === enums.ECliFlags.ShortHelp) {
      Log.log('Cli', enums.ECliResponses.UnificateHelp);
    } else {
      const builder = new UniQueryBuilder(args);
      const params = builder.init();

      if (builder.isEmpty()) return Log.error('Cli', 'Malformed params');

      await new Unification().init(params);
    }
    return undefined;
  }

  /**
   * Start decoding files.
   * @description Start decoding selected files.
   * @param fileName Target to use.
   * @returns {void} Void.
   * @async
   * @private
   */
  private async decode(fileName?: string): Promise<void> {
    Log.debug('Cli', 'Decodding');

    const logs = await this.decoder.init(fileName);

    Log.log('Logs', logs);
  }

  /**
   * Start decoding files.
   * @description Start decoding selected files.
   * @param fileName Target to use.
   * @param logFormat Target log format.
   * @returns {void} Void.
   * @async
   * @private
   */
  private async migrate(
    fileName?: string,
    logFormat?: enums.ECliFlags.FormatJson | enums.ECliFlags.FormatProto,
  ): Promise<void> {
    Log.debug('Cli', 'Migrating');

    FileReader.readConfig();
    await this.migration.init(fileName, logFormat);
  }
  /**
   * Start decoding files.
   * @description Start decoding selected files.
   * @param fileName Target to use.
   * @returns {void} Void.
   * @async
   * @private
   */
  private async saveDecoded(fileName?: string): Promise<void> {
    Log.debug('Cli', 'Decoding and saving to file');

    await this.decoder.saveDecoded(fileName);
  }
}
