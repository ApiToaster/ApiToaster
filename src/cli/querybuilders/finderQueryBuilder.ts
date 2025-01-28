import * as enums from '../../enums/index.js';
import Log from '../../tools/logger.js';
import type { IFindParams, ICliArgs } from '../../../types/index.js';

export default class QueryBuilder {
  private _lastCommmand: enums.ECliFlags | undefined = undefined;

  private _args: ICliArgs;

  private _params: IFindParams = {
    // force: false,
    files: [],
    keys: [],
    values: [],
    ips: [],
    json: {},
    methods: [],
    statusCodes: [],
    path: '',
  };

  constructor(args: ICliArgs) {
    this._args = args;
  }

  private get lastCommmand(): enums.ECliFlags | undefined {
    return this._lastCommmand;
  }

  private set lastCommmand(val: enums.ECliFlags | undefined) {
    this._lastCommmand = val;
  }

  private get args(): ICliArgs {
    return this._args;
  }

  private set args(val: ICliArgs) {
    this._args = val;
  }

  private get params(): IFindParams {
    return this._params;
  }

  private set params(val: IFindParams) {
    this._params = val;
  }

  /**
   * Start query builder.
   * @description Start query builder and generate all queries..
   * @returns {IFindParams} Parameters found in config.
   */
  init(): IFindParams {
    if (this.args.length === 0) return this.params;

    const target = this.args[0];

    switch (target) {
      case enums.ECliFlags.ShortPath:
      case enums.ECliFlags.Path:
      case enums.ECliFlags.ShortFile:
      case enums.ECliFlags.File:
      case enums.ECliFlags.Value:
      case enums.ECliFlags.ShortValue:
      case enums.ECliFlags.Keys:
      case enums.ECliFlags.ShortKeys:
      case enums.ECliFlags.Ip:
      case enums.ECliFlags.ShortIp:
      case enums.ECliFlags.ShortJson:
      case enums.ECliFlags.Json:
      case enums.ECliFlags.Method:
      case enums.ECliFlags.ShortMethod:
      case enums.ECliFlags.Code:
      case enums.ECliFlags.ShortCode:
        this.lastCommmand = target;
        break;
      default:
        this.addParam(target as string);
        break;
    }

    this.args = this.args.slice(1);
    return this.init();
  }

  isEmpty(): boolean {
    return (
      this.params.ips.length === 0 &&
      Object.keys(this.params.json).length === 0 &&
      this.params.values.length === 0 &&
      this.params.keys.length === 0 &&
      this.params.files.length === 0 &&
      this.params.path.length === 0 &&
      this.params.methods.length === 0 &&
      this.params.statusCodes.length === 0
    );
  }

  /**
   * Init query builder.
   * @description Start query builder and generate all queries.
   * @param target User's argument.
   * @returns {void} Void.
   * @private
   */
  private addParam(target: string): void {
    if (!this.lastCommmand) return Log.error('QueryBuilder', 'Tried to add param without providing flag for its type.');

    switch (this.lastCommmand) {
      case enums.ECliFlags.ShortPath:
      case enums.ECliFlags.Path:
        this.params.path = target;
        break;
      case enums.ECliFlags.Value:
      case enums.ECliFlags.ShortValue:
        this.params.values.push(target);
        break;
      case enums.ECliFlags.Keys:
      case enums.ECliFlags.ShortKeys:
        this.params.keys.push(target);
        break;
      case enums.ECliFlags.File:
      case enums.ECliFlags.ShortFile:
        this.params.files.push(target);
        break;
      case enums.ECliFlags.Ip:
      case enums.ECliFlags.ShortIp:
        this.params.ips.push(target);
        break;
      case enums.ECliFlags.ShortMethod:
      case enums.ECliFlags.Method:
        this.params.methods.push(target);
        break;
      case enums.ECliFlags.Code:
      case enums.ECliFlags.ShortCode:
        this.params.methods.push(target);
        break;
      case enums.ECliFlags.Json:
      case enums.ECliFlags.ShortJson:
        try {
          this.params.json = JSON.parse(target) as Record<string, unknown>;
        } catch (err) {
          Log.debug('QueryBuilder', 'Got error while formatting json', (err as Error).message);
          Log.error(
            'QueryBuilder',
            'Malformed json value. If you think that this is en error, more information can be found in debug mode',
          );
        }
        break;
      default:
        Log.error('QueryBuilder', 'About to add param for unsupported commannd.');
    }

    return undefined;
  }
}
