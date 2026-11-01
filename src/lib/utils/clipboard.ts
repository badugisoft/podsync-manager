/**
 * HTTPS, HTTP(로컬 네트워크 등), 브라우저 제약 조건에서도 안정적으로 동작하는 클립보드 복사 유틸리티
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. 최신 Clipboard API 시도 (보안 컨텍스트)
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // 권한 거부 또는 포커스 문제 발생 시 Fallback으로 계속 진행
    }
  }

  // 2. Fallback: 임시 textarea를 사용한 document.execCommand('copy')
  if (typeof document !== 'undefined') {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      
      // 화면 밖으로 이동하여 스크롤 튐 방지
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      textArea.style.opacity = '0';
      textArea.setAttribute('readonly', '');
      
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    } catch (err) {
      console.error('[Clipboard Fallback Error]:', err);
      return false;
    }
  }

  return false;
}
