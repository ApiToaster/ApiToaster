export interface IToasterTimeTravel {
  waitUntillNextReq?: number;
  inputBeforeNextReq?: boolean;
  port: number;
  path?: string;
  removeMalformed?:boolean
  countTime: boolean
  logFileSize: number;
}

export interface ITimeTravelStats {
  failed: {
    amount: number;
    ids: string[];
  };
  succeeded: {
    amount: number;
    ids: string[];
  };
}
export interface ITimeTravelReq {
  method: string;
  body?: string
  path?:string
  headers?: Record<string, string>;
}
