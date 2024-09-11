import chalk from 'chalk';

export default class Log {
  private static _shouldLog: boolean = false;

  private static get shouldLog(): boolean {
    return this._shouldLog;
  }

  private static set shouldLog(val: boolean) {
    this._shouldLog = val;
  }

  private static getDate(): string {
    const date = new Date();
    const h = date.getHours().toString().length === 1 ? `0${date.getHours()}:` : `${date.getHours()}:`;
    const m = date.getMinutes().toString().length === 1 ? `0${date.getMinutes()}:` : `${date.getMinutes()}:`;
    const s = date.getSeconds().toString().length === 1 ? `0${date.getSeconds()}` : `${date.getSeconds()}`;
    return `${h}${m}${s}`;
  }

  static logAll(): void {
    this.shouldLog = true;
  }

  static error(target: string, ...messages: unknown[]): void {
    messages.forEach((m) => {
      Log.buildLog(() => chalk.red(`Log.ERROR: ${target}`), m, true);
    });
  }

  static warn(target: string, ...messages: unknown[]): void {
    messages.forEach((m) => {
      Log.buildLog(() => chalk.yellow(`Log.WARN: ${target}`), m);
    });
  }

  static log(target: string, ...messages: unknown[]): void {
    messages.forEach((m) => {
      Log.buildLog(() => chalk.blue(`Log.LOG: ${target}`), m);
    });
  }

  static debug(target: string, ...messages: unknown[]): void {
    if (process.env.NODE_ENV !== 'test') return;

    messages.forEach((m) => {
      Log.buildLog(() => chalk.magenta(`Log.Debug: ${target}`), m);
    });
  }

  static trace(target: string, ...messages: unknown[]): void {
    if (process.env.NODE_ENV === 'test') console.trace(chalk.yellowBright(target));

    messages.forEach((m) => {
      Log.buildLog(() => chalk.yellowBright(`Log.TRACE: ${target}`), m);
    });
  }

  private static buildLog(color: () => string, message: unknown, error?: boolean): void {
    if (process.env.NODE_ENV === 'test' || error || Log.shouldLog) {
      console.info(`[${chalk.gray(Log.getDate())}] [ApiToaster] ${color()} ${Log.toString(message)}`);
    }
  }

  private static toString(message: unknown): string {
    return typeof message !== 'string' ? JSON.stringify(message, null, 2) : message;
  }
}
