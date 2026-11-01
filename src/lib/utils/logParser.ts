export type LogLevel = 'info' | 'warn' | 'error' | 'debug' | 'other';

export interface ParsedLog {
  id: string;
  raw: string;
  timestamp: string;
  displayTime: string;
  level: LogLevel;
  message: string;
  fields: { key: string; value: string }[];
}

/**
 * Docker 타임스탬프 및 Logrus log 포맷 파서
 */
export function parseLogLine(rawLine: string, index: number, fallbackTime?: string): ParsedLog {
  // 제어 문자 및 비가시 문자 정리
  let line = rawLine.replace(/^[\x00-\x1F\x7F-\x9F]+/, '').trim();
  let timestamp = '';
  let displayTime = '';

  // 1. Docker ISO 타임스탬프 감지
  // 예: 2026-10-31T14:45:01.123456789Z 또는 2026-10-31T14:45:01+00:00
  const dockerTsMatch = line.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))\s+/);
  if (dockerTsMatch) {
    timestamp = dockerTsMatch[1];
    line = line.slice(dockerTsMatch[0].length).trim();
  }

  // 2. Logrus time="..." 필드 감지
  const logrusTimeMatch = line.match(/\btime="([^"]+)"\s*/);
  if (logrusTimeMatch) {
    if (!timestamp) timestamp = logrusTimeMatch[1];
    line = line.replace(logrusTimeMatch[0], '').trim();
  }

  if (timestamp) {
    try {
      const d = new Date(timestamp);
      if (!isNaN(d.getTime())) {
        const yyyy = d.getFullYear();
        const MM = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mm = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        displayTime = `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
      } else {
        displayTime = timestamp.replace('T', ' ').slice(0, 19);
      }
    } catch {
      displayTime = timestamp.replace('T', ' ').slice(0, 19);
    }
  } else if (fallbackTime) {
    // 멀티라인 연속 줄인 경우 직전 줄의 시간을 상속
    displayTime = fallbackTime;
  }

  // 3. 로그 레벨 감지 (Logrus level=xxx or [LEVEL] or LEVEL:)
  let level: LogLevel = 'other';
  const levelMatch = line.match(/\blevel=([a-zA-Z]+)\b/);
  if (levelMatch) {
    const lvl = levelMatch[1].toLowerCase();
    if (lvl.includes('err') || lvl.includes('fatal') || lvl.includes('panic')) level = 'error';
    else if (lvl.includes('warn')) level = 'warn';
    else if (lvl.includes('info')) level = 'info';
    else if (lvl.includes('debug') || lvl.includes('trace')) level = 'debug';
    line = line.replace(levelMatch[0], '').trim();
  } else {
    // 텍스트 기반 레벨 감지
    const upper = line.toUpperCase();
    if (upper.includes('ERROR:') || upper.includes('[ERROR]') || upper.startsWith('ERR:') || upper.includes('FATAL:')) {
      level = 'error';
    } else if (upper.includes('WARN:') || upper.includes('[WARN]') || upper.includes('WARNING:')) {
      level = 'warn';
    } else if (upper.includes('INFO:') || upper.includes('[INFO]') || upper.includes('[DOWNLOAD]')) {
      level = 'info';
    } else if (upper.includes('DEBUG:') || upper.includes('[DEBUG]')) {
      level = 'debug';
    }
  }

  // 4. Logrus msg="..." 추출
  let message = '';
  const msgMatch = line.match(/\bmsg="([^"]*)"/);
  if (msgMatch) {
    message = msgMatch[1];
    line = line.replace(msgMatch[0], '').trim();
  }

  // 5. key="value" 또는 key=value 추가 속성 추출
  const fields: { key: string; value: string }[] = [];
  const kvRegex = /\b([a-zA-Z0-9_\-]+)=(?:"([^"]*)"|([^\s]+))/g;
  let kvMatch: RegExpExecArray | null;

  while ((kvMatch = kvRegex.exec(line)) !== null) {
    const key = kvMatch[1];
    const value = kvMatch[2] !== undefined ? kvMatch[2] : kvMatch[3];
    if (key !== 'time' && key !== 'level' && key !== 'msg') {
      fields.push({ key, value });
    }
  }

  if (!message) {
    const cleaned = line.replace(kvRegex, '').trim();
    message = cleaned || line || rawLine;
  }

  return {
    id: `${Date.now()}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    raw: rawLine,
    timestamp,
    displayTime: displayTime || '연속 줄 (이전 동일)',
    level,
    message,
    fields
  };
}
