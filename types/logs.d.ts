import { IncomingHttpHeaders } from 'http';
import {ParsedQs}from 'qs'

export interface IMetadata {
    logCount: number;
}

export interface ILogEntry {
    method?: string;
    body: string;
    queryParams?: string;
    headers?: string;
    ip?: string;
    statusCode?: number;
    occured?: string;
    duration:number
}

export interface INotFormattedLogEntry {
    method?: string;
    body: Record<string, unknown>;
    queryParams?:ParsedQs
    headers?: IncomingHttpHeaders;
    ip?: string;
    statusCode?: number;
    occured?: string;
    duration:number
}

export interface ILogProto {
    [key: string]: string;
}

export interface ILog {
    [key: string]: ILogEntry;
}

export interface ILogsProto {
    logs: ILogProto;
    meta: IMetadata;
}
export interface ILogs {
    logs: ILog;
    meta: IMetadata;
}

export interface IIndexEntry {
    [key: string]: string;
}

export interface IIndex {
    indexes: IIndexEntry;
}
