import { useEffect, useRef, useState, useCallback } from 'react';
import { Client, IMessage } from '@stomp/stompjs';
import { LiveEventMessage } from '../types/live';

interface UseLiveSocketOptions {
  sessionId?: number | null;
  onMessage?: (event: LiveEventMessage) => void;
  enabled?: boolean;
}

export function useLiveSocket({
  sessionId,
  onMessage,
  enabled = true,
}: UseLiveSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  useEffect(() => {
    if (!enabled) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const defaultWsUrl = `${protocol}//${host}/ws-live`;
    const brokerURL = import.meta.env.VITE_WS_URL || defaultWsUrl;

    const client = new Client({
      brokerURL,
      reconnectDelay: 3000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (msg) => {
        if (import.meta.env.DEV && false) {
          console.debug('[STOMP]', msg);
        }
      },
    });

    client.onConnect = () => {
      setIsConnected(true);

      const handleIncomingMessage = (message: IMessage) => {
        try {
          const parsed: LiveEventMessage = JSON.parse(message.body);
          if (onMessageRef.current) {
            onMessageRef.current(parsed);
          }
        } catch (e) {
          console.error('[STOMP] Failed to parse message body:', e);
        }
      };

      // Always subscribe to global topic where 100% of live events are published
      client.subscribe('/topic/live/global', handleIncomingMessage);
    };

    client.onDisconnect = () => {
      setIsConnected(false);
    };

    client.onStompError = (frame) => {
      console.error('[STOMP] Broker error:', frame.headers['message'], frame.body);
      setIsConnected(false);
    };

    client.activate();
    clientRef.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
      setIsConnected(false);
    };
  }, [enabled]);

  const sendMessage = useCallback((destination: string, body: any) => {
    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish({
        destination,
        body: JSON.stringify(body),
      });
    } else {
      console.warn('[STOMP] Cannot send message, client not connected');
    }
  }, []);

  return { isConnected, sendMessage };
}
