export enum SpeedSetting {
  Paused = 0,
  Normal = 1,
  Fast = 2,
  Fastest = 4,
}

export const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
] as const;

export const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export interface GameDateTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}

export const START_YEAR = 1850;
export const START_MONTH = 0;
export const START_DAY = 1;
export const START_HOUR = 6;
export const START_MINUTE = 0;
export const MS_PER_GAME_MINUTE = 250;
