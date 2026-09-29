import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': (errorCode?: string | number) => void;
        },
      ) => string;
      remove: (widgetId: string) => void;
    };
  }
}

type Props = {
  siteKey: string;
  resetKey: number;
  onToken: (token: string) => void;
  onExpire: () => void;
};

const SCRIPT_ID = 'turnstile-api-script';

export default function TurnstileWidget({ siteKey, resetKey, onToken, onExpire }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const onTokenRef = useRef(onToken);
  const onExpireRef = useRef(onExpire);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
  }, [onToken, onExpire]);

  useEffect(() => {
    let cancelled = false;
    setErrorMessage(null);

    if (!siteKey || siteKey.trim() === '') {
      setErrorMessage('Chưa cấu hình Turnstile Site Key. Vui lòng kiểm tra biến môi trường VITE_TURNSTILE_SITE_KEY.');
      return;
    }

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) {
        return;
      }

      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      try {
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token) => {
            setErrorMessage(null);
            onTokenRef.current(token);
          },
          'expired-callback': () => {
            onExpireRef.current();
          },
          'error-callback': (errorCode) => {
            console.error('[Cloudflare Turnstile Error]', errorCode);
            onExpireRef.current();
            const codeStr = String(errorCode || '');
            if (codeStr.includes('110200')) {
              setErrorMessage(
                `Tên miền "${window.location.hostname}" chưa được cấp phép trong Cloudflare Turnstile. Vui lòng thêm domain vào mục Allowed Domains trên Cloudflare Dashboard.`
              );
            } else if (codeStr.includes('300030')) {
              setErrorMessage(
                `Turnstile Site Key không hợp lệ. Vui lòng kiểm tra lại cấu hình trên Cloudflare Dashboard.`
              );
            } else {
              setErrorMessage(
                `Xác thực bot gặp sự cố (${errorCode ? `Mã lỗi: ${errorCode}` : 'Không phản hồi'}). Vui lòng kiểm tra kết nối mạng hoặc thử lại.`
              );
            }
          },
        });
      } catch (err) {
        console.error('Failed to render Turnstile widget:', err);
      }
    };

    const existingScript = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (window.turnstile) {
      renderWidget();
    } else if (existingScript) {
      existingScript.addEventListener('load', renderWidget, { once: true });
    } else {
      const script = document.createElement('script');
      script.id = SCRIPT_ID;
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.addEventListener('load', renderWidget, { once: true });
      script.addEventListener('error', () => {
        setErrorMessage('Không thể tải Cloudflare Turnstile script. Vui lòng kiểm tra kết nối mạng hoặc chặn quảng cáo/VPN.');
      });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, resetKey]);

  return (
    <div className="flex flex-col items-center notranslate" translate="no">
      <div ref={containerRef} className="min-h-[65px]" />
      {errorMessage && (
        <div className="mt-2 text-xs text-rose-300 bg-rose-950/60 border border-rose-500/40 rounded-lg p-2.5 max-w-sm text-center leading-relaxed">
          ⚠️ {errorMessage}
        </div>
      )}
    </div>
  );
}
