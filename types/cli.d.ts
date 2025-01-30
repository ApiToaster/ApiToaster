import type * as enums from '../src/enums/index.js';

export type ICliArgs = enums.ECliOptions[] | enums.ECliFlags[] | string[];

export interface IFindParams {
  files: string[];
  keys: string[];
  values: string[];
  ips: string[];
  json: Record<string, unknown>;
  methods: string[];
  statusCodes: number[];
  path:string;
}
