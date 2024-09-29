import QueryBuilder from './queryBuilder.js';
import * as enums from '../enums/index.js';
import FileFinder from '../module/files/finder.js';
import TimeTravel from '../module/timeTravel/index.js';
import defaultConfig from '../tools/config.js';
import Log from '../tools/logger.js';
import State from '../tools/state.js';
import Validation from '../tools/validator.js';
import type { IToasterTimeTravel, ICliArgs } from '../../types/index.js';
import fs from 'fs';
import path from 'path';

export default class Cli {
  private readonly _timeTravel: TimeTravel;

  constructor() {
    this._timeTravel = new TimeTravel();
  }

  private get timeTravel(): TimeTravel {
    return this._timeTravel;
  }

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
      case enums.ECliOptions.Find:
        return this.handleFind(args.slice(1));
      case enums.ECliFlags.Help:
        return Log.log('Cli', enums.ECliResponses.Help);
      default:
        return Log.error('Cli', 'Provided unknown params. Use --help');
    }
  }

  private async handleDecode(args: ICliArgs): Promise<void> {
    Log.debug('Cli', 'Handeling decode');

    const flag = args[0];
    const target = args[1];

    switch (flag) {
      case enums.ECliFlags.Path:
      case enums.ECliFlags.ShortPath:
        !target ? Log.error('Cli', 'Please provide file to decode.') : await this.decode(target);
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
        Log.error('Cli', 'Unknown parameter.', enums.ECliResponses.TimeTravelUnknownCommand);
        break;
    }
  }

  private async handleTimeTravel(args: ICliArgs): Promise<void> {
    Log.debug('Cli', 'Handeling time travel');

    const flag = args[0];
    const target = args[1];

    switch (flag) {
      case enums.ECliFlags.Path:
      case enums.ECliFlags.ShortPath:
        !target ? Log.error('Cli', 'Please provide a log file name.') : await this.initTimeTravel(target);
        break;
      case enums.ECliFlags.Help:
      case enums.ECliFlags.ShortHelp:
        Log.log('Cli', enums.ECliResponses.TimeTravelHelp);
        break;
      case undefined:
      case null:
        await this.initTimeTravel();
        break;
      default:
        Log.error('Cli', 'Unknown parameter.', enums.ECliResponses.TimeTravelUnknownCommand);
        break;
    }
  }

  private async handleFind(args: ICliArgs): Promise<void> {
    Log.debug('Cli', 'Handeling find');

    const builder = new QueryBuilder(args);
    const params = builder.init();

    if (builder.isEmpty()) return Log.error('Cli', 'Malformed params');

    return new FileFinder().find(params);
  }

  private async initTimeTravel(fileName?: string): Promise<void> {
    Log.debug('Cli', 'Starting time travel');

    const config = this.readConfig();
    await this.timeTravel.init(config, fileName);
  }

  private async decode(fileName?: string): Promise<void> {
    Log.debug('Cli', 'Decodding');

    this.readConfig();
    await this.timeTravel.decode(fileName);
  }

  private readConfig(): IToasterTimeTravel {
    Log.debug('Cli', 'Reading config');

    if (!fs.existsSync(path.join(process.cwd(), 'toaster.json'))) {
      throw new Error('Missing toaster config');
    }

    try {
      const file = fs.readFileSync(path.join(process.cwd(), 'toaster.json'));
      const config = JSON.parse(file.toString()) as IToasterTimeTravel;
      this.validateConfig(config);

      State.config = { ...defaultConfig() };
      if (config.path) State.config.path = config.path;

      return config;
    } catch (_err) {
      throw new Error('Malformed toaster config');
    }
  }

  private validateConfig(config: IToasterTimeTravel): void {
    Log.debug('Cli', 'Validating config');

    new Validation(config, 'config').isDefined().isObject();
    new Validation(config.port, 'config.port').isDefined().isNumber();
    if (config.path) new Validation(config.path, 'config.path').isDefined().isString();
  }
}