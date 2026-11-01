import type { Locale } from '$lib/i18n/translations';

export function parsePeriodToMs(periodStr?: string): number | null {
  if (!periodStr) return null;
  const match = periodStr.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      return null;
  }
}

export function formatRemaining(ms: number, locale: Locale = 'en'): string {
  if (ms <= 0) {
    if (locale === 'ko') return '곧 실행';
    if (locale === 'ja') return 'まもなく実行';
    if (locale === 'zh') return '即将运行';
    if (locale === 'es') return 'Pronto';
    if (locale === 'fr') return 'Bientôt';
    if (locale === 'de') return 'Bald';
    return 'Soon';
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) {
    if (locale === 'ko') return '1분 미만 남음';
    if (locale === 'ja') return '1分未満';
    if (locale === 'zh') return '少于 1 分钟';
    if (locale === 'es') return '< 1 min';
    if (locale === 'fr') return '< 1 min';
    if (locale === 'de') return '< 1 Min.';
    return '< 1m left';
  }

  if (hours < 1) {
    if (locale === 'ko') return `약 ${minutes}분 남음`;
    if (locale === 'ja') return `残り約${minutes}分`;
    if (locale === 'zh') return `约剩余 ${minutes} 分钟`;
    if (locale === 'es') return `~${minutes} min`;
    if (locale === 'fr') return `~${minutes} min`;
    if (locale === 'de') return `~${minutes} Min.`;
    return `~${minutes}m left`;
  }

  if (days < 1) {
    const remMin = minutes % 60;
    if (locale === 'ko') {
      return remMin > 0 ? `약 ${hours}시간 ${remMin}분 남음` : `약 ${hours}시간 남음`;
    }
    if (locale === 'ja') {
      return remMin > 0 ? `残り約${hours}時間${remMin}分` : `残り約${hours}時間`;
    }
    if (locale === 'zh') {
      return remMin > 0 ? `约剩余 ${hours} 小时 ${remMin} 分钟` : `约剩余 ${hours} 小时`;
    }
    if (locale === 'es') {
      return remMin > 0 ? `~${hours} h ${remMin} min` : `~${hours} h`;
    }
    if (locale === 'fr') {
      return remMin > 0 ? `~${hours} h ${remMin} min` : `~${hours} h`;
    }
    if (locale === 'de') {
      return remMin > 0 ? `~${hours} Std. ${remMin} Min.` : `~${hours} Std.`;
    }
    return remMin > 0 ? `~${hours}h ${remMin}m left` : `~${hours}h left`;
  }

  const remHours = hours % 24;
  if (locale === 'ko') {
    return remHours > 0 ? `약 ${days}일 ${remHours}시간 남음` : `약 ${days}일 남음`;
  }
  if (locale === 'ja') {
    return remHours > 0 ? `残り約${days}日${remHours}時間` : `残り約${days}日`;
  }
  if (locale === 'zh') {
    return remHours > 0 ? `约剩余 ${days} 天 ${remHours} 小时` : `约剩余 ${days} 天`;
  }
  if (locale === 'es') {
    return remHours > 0 ? `~${days} d ${remHours} h` : `~${days} d`;
  }
  if (locale === 'fr') {
    return remHours > 0 ? `~${days} j ${remHours} h` : `~${days} j`;
  }
  if (locale === 'de') {
    return remHours > 0 ? `~${days} Tage ${remHours} Std.` : `~${days} Tage`;
  }
  return remHours > 0 ? `~${days}d ${remHours}h left` : `~${days}d left`;
}

export function getNextSyncInfo(
  period?: string,
  cron?: string,
  containerStartedAt?: string,
  _tick?: number,
  locale: Locale = 'en'
): { remaining: string; nextTime: string } | null {
  const periodMs = parsePeriodToMs(period);

  if (periodMs) {
    const now = Date.now();
    let baseTime = now;
    if (containerStartedAt) {
      const started = new Date(containerStartedAt).getTime();
      if (!isNaN(started)) {
        baseTime = started;
      }
    }

    const elapsed = Math.max(0, now - baseTime);
    const remainder = elapsed % periodMs;
    const remainingMs = periodMs - remainder;
    const nextDate = new Date(now + remainingMs);

    const hh = String(nextDate.getHours()).padStart(2, '0');
    const mm = String(nextDate.getMinutes()).padStart(2, '0');
    const nextTime = `${hh}:${mm}`;

    return {
      remaining: formatRemaining(remainingMs, locale),
      nextTime
    };
  }

  if (cron) {
    let cronLabel = 'Cron schedule';
    if (locale === 'ko') cronLabel = '크론 지정 시간';
    else if (locale === 'ja') cronLabel = 'Cronスケジュール';
    else if (locale === 'zh') cronLabel = 'Cron 计划时间';
    else if (locale === 'es') cronLabel = 'Programación Cron';
    else if (locale === 'fr') cronLabel = 'Planification Cron';
    else if (locale === 'de') cronLabel = 'Cron-Zeitplan';

    return {
      remaining: cronLabel,
      nextTime: cron
    };
  }

  return null;
}
