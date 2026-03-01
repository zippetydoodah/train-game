import {
  SpeedSetting,
  GameDateTime,
  MONTH_NAMES,
  DAYS_IN_MONTH,
  START_YEAR,
  START_MONTH,
  START_DAY,
  START_HOUR,
  START_MINUTE,
  MS_PER_GAME_MINUTE,
} from '../types/time';

export class TimeSystem {
  private elapsedMinutes: number = 0;
  private accumulator: number = 0;
  private speed: SpeedSetting = SpeedSetting.Normal;
  private forcePaused: boolean = false;

  update(deltaMs: number): void {
    if (this.speed === SpeedSetting.Paused || this.forcePaused) return;
    this.accumulator += deltaMs * this.speed;
    while (this.accumulator >= MS_PER_GAME_MINUTE) {
      this.accumulator -= MS_PER_GAME_MINUTE;
      this.elapsedMinutes++;
    }
  }

  getDateTime(): GameDateTime {
    let remaining = this.elapsedMinutes;
    const minuteOffset = remaining % 60;
    remaining = Math.floor(remaining / 60);
    const hourOffset = remaining % 24;
    remaining = Math.floor(remaining / 24);

    let minute = START_MINUTE + minuteOffset;
    let hour = START_HOUR + hourOffset;
    let dayOverflow = 0;

    if (minute >= 60) {
      minute -= 60;
      hour++;
    }
    if (hour >= 24) {
      hour -= 24;
      dayOverflow = 1;
    }

    const totalDays = remaining + dayOverflow;
    let year = START_YEAR;
    let month = START_MONTH;
    let day = START_DAY + totalDays;

    while (day > DAYS_IN_MONTH[month]) {
      day -= DAYS_IN_MONTH[month];
      month++;
      if (month >= 12) {
        month = 0;
        year++;
      }
    }

    return { year, month, day, hour, minute };
  }

  getDisplayString(): string {
    const dt = this.getDateTime();
    const hh = String(dt.hour).padStart(2, '0');
    const mm = String(dt.minute).padStart(2, '0');
    const monthName = MONTH_NAMES[dt.month];
    return `${hh}:${mm}  ${monthName} ${dt.day}, ${dt.year}`;
  }

  setSpeed(speed: SpeedSetting): void {
    this.speed = speed;
  }

  getSpeed(): SpeedSetting {
    return this.speed;
  }

  setForcePaused(paused: boolean): void {
    this.forcePaused = paused;
  }

  getElapsedMinutes(): number {
    return this.elapsedMinutes;
  }

  setElapsedMinutes(minutes: number): void {
    this.elapsedMinutes = minutes;
    this.accumulator = 0;
  }
}
