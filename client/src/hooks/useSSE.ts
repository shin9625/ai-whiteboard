import { useEffect, useState } from 'react';
import { BoardEvent } from '../types';

export function useSSE(onEvent: (event: BoardEvent) => void) {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let retryTimeout: any = null;

    function connect() {
      eventSource = new EventSource('/api/events');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource?.close();
        retryTimeout = setTimeout(connect, 3000);
      };

      const eventTypes = [
        'connected',
        'task_created',
        'task_updated',
        'task_moved',
        'task_deleted',
        'note_added',
        'note_updated',
        'note_deleted',
        'board_reset',
      ];

      eventTypes.forEach((type) => {
        eventSource?.addEventListener(type, (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            onEvent({ type: type as any, timestamp: new Date().toISOString(), payload: data });
          } catch (err) {
            console.error('Failed to parse SSE event data', err);
          }
        });
      });
    }

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, [onEvent]);

  return { isConnected };
}
