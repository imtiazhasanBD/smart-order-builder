export type SyncEventType =
  | 'CART_UPDATED'
  | 'ORDER_COMPLETED'
  | 'DRAFT_UPDATED'
  | 'STOCK_CHANGED';

export interface SyncMessage {
  id?: string;
  type: SyncEventType;
  timestamp: number;
  senderId: string;
  payload?: any;
}

const CHANNEL_NAME = 'smart_order_builder_sync_channel';
const STORAGE_SYNC_KEY = 'smart_order_builder_sync_event';

// Generate unique session tab ID to ignore self-broadcasted messages
export const currentTabId =
  typeof window !== 'undefined'
    ? `tab-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`
    : 'tab-server';

let broadcastChannelInstance: BroadcastChannel | null = null;

function getBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') {
    return null;
  }
  if (!broadcastChannelInstance) {
    try {
      broadcastChannelInstance = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      broadcastChannelInstance = null;
    }
  }
  return broadcastChannelInstance;
}

// broadcast sync to all other open tabs
export function broadcastSync(type: SyncEventType, payload?: any): void {
  const message: SyncMessage = {
    id: `${currentTabId}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
    type,
    timestamp: Date.now(),
    senderId: currentTabId,
    payload,
  };

  const channel = getBroadcastChannel();
  if (channel) {
    try {
      channel.postMessage(message);
    } catch {
      // Ignore channel post failure
    }
  }

  // Storage event fallback (guarantees cross-tab propagation in all browsers)
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(message));
    } catch {
      // Ignore storage write failure
    }
  }
}

// subscribe to events sent from other tabs
export function subscribeToSync(callback: (msg: SyncMessage) => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let lastProcessedKey = '';

  const processMessage = (msg: SyncMessage) => {
    if (!msg || msg.senderId === currentTabId) return;

    // Deduplicate identical events received via multiple transports (BroadcastChannel + storage)
    const messageKey = msg.id || `${msg.senderId}-${msg.type}-${msg.timestamp}`;
    if (messageKey === lastProcessedKey) return;
    lastProcessedKey = messageKey;

    callback(msg);
  };

  const channel = getBroadcastChannel();

  const handleChannelMessage = (event: MessageEvent<SyncMessage>) => {
    processMessage(event.data);
  };

  if (channel) {
    channel.addEventListener('message', handleChannelMessage);
  }

  const handleStorageEvent = (event: StorageEvent) => {
    if (event.key === STORAGE_SYNC_KEY && event.newValue) {
      try {
        const msg: SyncMessage = JSON.parse(event.newValue);
        processMessage(msg);
      } catch {
        // Ignore parse errors
      }
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  return () => {
    if (channel) {
      channel.removeEventListener('message', handleChannelMessage);
    }
    window.removeEventListener('storage', handleStorageEvent);
  };
}
