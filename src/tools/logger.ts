import chalk from 'chalk';

export default class Log {
  private static _shouldLog: boolean = false;
  private static _counter: { target: string; start: number }[] = [];

  private static get counter(): { target: string; start: number }[] {
    return this._counter;
  }

  private static set counter(val: { target: string; start: number }[]) {
    this._counter = val;
  }

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
      Log.buildLog(() => chalk.red(`Log.WARN: ${target}`), m);
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

  static time(target: string, ...messages: unknown[]): void {
    const localTarget = Log.counter.find((e) => e.target === target);
    if (localTarget) {
      Log.buildLog(() => chalk.bgBlue(`Log.TIME: ${target}`), `Overwriting time counter for ${target}`, true);
    }

    Log.counter.push({ target, start: Date.now() });
    messages.forEach((m) => {
      Log.buildLog(() => chalk.bgBlue(`Log.TIME: ${target}`), m, true);
    });
  }

  static endTime(target: string, ...messages: unknown[]): void {
    const localTarget = Log.counter.find((e) => e.target === target);
    if (!localTarget) {
      Log.buildLog(() => chalk.bgBlue(`Log.TIME: ${target}`), 'Could not find time start', true);
    } else {
      Log.counter = Log.counter.filter((e) => e.target !== target);
      Log.buildLog(
        () => chalk.bgBlue(`Log.TIME: ${target}`),
        `Time passed: ${((Date.now() - localTarget.start) / 1000).toFixed(2)}s`,
        true,
      );
    }

    messages.forEach((m) => {
      Log.buildLog(() => chalk.bgBlue(`Log.TIME: ${target}`), m);
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
