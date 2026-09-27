import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          'expired-callback': () => void;
          'error-callback': () => void;
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

  useEffect(() => {
    onTokenRef.current = onToken;
    onExpireRef.current = onExpire;
  }, [onToken, onExpire]);

  useEffect(() => {
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile) {
        return;
      }

      if (widgetIdRef.current) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => onTokenRef.current(token),
        'expired-callback': () => onExpireRef.current(),
        'error-callback': () => onExpireRef.current(),
      });
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
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
    };
    // Only rebuild Turnstile when its identity changes or the parent explicitly requests a reset.
  }, [siteKey, resetKey]);

  return <div ref={containerRef} className="min-h-[65px] notranslate" translate="no" />;
}
