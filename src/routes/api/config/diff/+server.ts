import { json, type RequestHandler } from '@sveltejs/kit';
import { loadConfig, getAppliedConfigToml } from '$lib/server/config';

export interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  text: string;
}

// LCS (Longest Common Subsequence) 기반 정밀 라인 Diff 알고리즘
function computeLineDiff(oldText: string, newText: string): DiffLine[] {
  // 줄바꿈 정규화 및 트레일링 공백 정리
  const normOld = (oldText || '').replace(/\r\n/g, '\n').trimEnd();
  const normNew = (newText || '').replace(/\r\n/g, '\n').trimEnd();

  if (normOld === normNew) {
    if (!normOld) return [];
    return normOld.split('\n').map((text) => ({ type: 'unchanged', text }));
  }

  const a = normOld ? normOld.split('\n') : [];
  const b = normNew ? normNew.split('\n') : [];

  const n = a.length;
  const m = b.length;

  // DP 테이블 작성
  // 공간 최적화 대신 가독성과 정확성을 위해 standard LCS Matrix 사용
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (a[i] === b[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  // 역추적(Backtracking)으로 diff 복원
  const result: DiffLine[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      result.push({ type: 'unchanged', text: a[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.push({ type: 'added', text: b[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      result.push({ type: 'removed', text: a[i - 1] });
      i--;
    }
  }

  return result.reverse();
}

export const GET: RequestHandler = async () => {
  const { rawToml: currentToml } = await loadConfig();
  const appliedToml = await getAppliedConfigToml();

  const diffLines = computeLineDiff(appliedToml, currentToml);
  const hasChanges = diffLines.some((line) => line.type !== 'unchanged');

  return json({
    appliedToml,
    currentToml,
    diffLines,
    hasChanges
  });
};
