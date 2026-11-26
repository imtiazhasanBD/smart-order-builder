import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OrderBuilder } from '@/features/configurator/OrderBuilder';
import { MENU_FIXTURE } from '@/mocks/data/menu';
import { serverStore } from '@/mocks/serverStore';
import { MenuResponse } from '@/types';
import {
  broadcastSync,
  subscribeToSync,
  SyncMessage,
} from '@/lib/syncChannel';

const DRAFT_STORAGE_KEY = 'smart_order_builder_draft_config';

const mockMenu: MenuResponse = {
  ...MENU_FIXTURE,
  serverTime: new Date().toISOString(),
};

describe('Step 11 — Multi-Tab Sync & Draft Recovery (Part G Bonus)', () => {
  beforeEach(() => {
    localStorage.clear();
    serverStore.reset();
  });

  afterEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  // ─── 1. Cross-Tab Sync Channel ──────────────────────────────────────────────

  it('broadcastSync dispatches message that other tabs receive', () => {
    const receivedMessages: SyncMessage[] = [];

    const unsubscribe = subscribeToSync((msg) => {
      receivedMessages.push(msg);
    });

    // Simulate an event arriving from another tab (different senderId)
    const externalMessage: SyncMessage = {
      type: 'CART_UPDATED',
      timestamp: Date.now(),
      senderId: 'different-tab-999',
    };

    // Dispatch via simulated storage event (cross-tab mechanism)
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'smart_order_builder_sync_event',
        newValue: JSON.stringify(externalMessage),
      })
    );

    expect(receivedMessages).toHaveLength(1);
    expect(receivedMessages[0].type).toBe('CART_UPDATED');
    expect(receivedMessages[0].senderId).toBe('different-tab-999');

    unsubscribe();
  });

  it('ignores self-broadcasted sync events to prevent feedback loops', () => {
    const receivedMessages: SyncMessage[] = [];

    const unsubscribe = subscribeToSync((msg) => {
      receivedMessages.push(msg);
    });

    // Broadcast from this tab
    broadcastSync('CART_UPDATED');

    // Storage event with own tab sender ID should be ignored
    expect(receivedMessages).toHaveLength(0);

    unsubscribe();
  });

  // ─── 2. Draft Persistence & Recovery in OrderBuilder ───────────────────────

  it('restores draft selections from localStorage and renders Draft Restored banner', () => {
    // Seed localStorage with a saved draft configuration
    const savedDraft = { toast: 1, scrambled: 2, sausage: 1 };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(savedDraft));

    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={MENU_FIXTURE.ingredientStock}
        onAddToCart={vi.fn()}
      />
    );

    // Banner is visible
    expect(screen.getByTestId('draft-restored-banner')).toBeInTheDocument();
    expect(screen.getByText(/Your previous item selections were recovered/i)).toBeInTheDocument();

    // Verify option counts are restored
    expect(screen.getByText('Scrambled')).toBeInTheDocument();
  });

  it('clearing draft via banner removes localStorage item and resets selections', async () => {
    const savedDraft = { toast: 1, scrambled: 2, sausage: 1 };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(savedDraft));

    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={MENU_FIXTURE.ingredientStock}
        onAddToCart={vi.fn()}
      />
    );

    const clearBtn = screen.getByRole('button', { name: /Clear Draft/i });
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);

    // Banner dismissed and localStorage key cleared
    expect(screen.queryByTestId('draft-restored-banner')).not.toBeInTheDocument();
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).toBeNull();
  });

  it('dismiss button closes the draft banner without clearing selections', () => {
    const savedDraft = { toast: 1, scrambled: 2, sausage: 1 };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(savedDraft));

    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={MENU_FIXTURE.ingredientStock}
        onAddToCart={vi.fn()}
      />
    );

    const dismissBtn = screen.getByRole('button', { name: /Dismiss draft notice/i });
    fireEvent.click(dismissBtn);

    // Banner is gone
    expect(screen.queryByTestId('draft-restored-banner')).not.toBeInTheDocument();

    // Selections remain in localStorage
    expect(localStorage.getItem(DRAFT_STORAGE_KEY)).not.toBeNull();
  });

  // ─── 3. Multi-Tab Version Conflict (Part G / Decision D1) ──────────────────

  it('server returns 409 conflict when clientVersion is stale, keeping state safe', () => {
    // Tab 1 creates reservation (increments cartVersion to 2)
    const r1 = serverStore.reserveItem('tab1-item', { toast: 1, scrambled: 2, sausage: 1 }, 1);
    expect(r1.success).toBe(true);

    // Tab 2 attempts reservation with stale cartVersion 1
    const r2 = serverStore.reserveItem(
      'tab2-item',
      { paratha: 1, fried: 2, tofu: 1 },
      1,
      1 // outdated clientVersion
    );

    expect(r2.success).toBe(false);
    expect(r2.conflict).toBe(true);
    expect(r2.error).toMatch(/modified in another session/i);

    // Cart contains only Tab 1's reservation
    expect(serverStore.getCartSnapshot().items).toHaveLength(1);
  });

  // ─── 4. Shared Mock Storage & Cross-Tab Cart State ─────────────────────────

  it('persists cart reservations to localStorage and recovers state across instances', () => {
    // Reserve item in Tab 1
    const res = serverStore.reserveItem('item-shared-1', { toast: 1, scrambled: 1 }, 1);
    expect(res.success).toBe(true);

    // Verify localStorage has persisted cart
    const storedCartRaw = localStorage.getItem('smart_order_builder_cart_v1');
    expect(storedCartRaw).not.toBeNull();
    const storedCart = JSON.parse(storedCartRaw!);
    expect(storedCart.items).toHaveLength(1);
    expect(storedCart.items[0].id).toBe(res.item!.id);

    // Simulate Tab 2 reading snapshot
    serverStore.syncFromStorage();
    const snapshot = serverStore.getCartSnapshot();
    expect(snapshot.items).toHaveLength(1);
    expect(snapshot.version).toBe(res.version);
  });

  // ─── 5. Real-Time OrderBuilder Cross-Tab Draft Sync ────────────────────────

  it('updates OrderBuilder selections in real time when DRAFT_UPDATED arrives from peer tab', () => {
    const { rerender } = render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={MENU_FIXTURE.ingredientStock}
        onAddToCart={vi.fn()}
      />
    );

    // Initially no selections in summary
    expect(screen.queryByText(/2× Scrambled/i)).not.toBeInTheDocument();

    // Peer tab broadcasts new draft
    const peerMessage: SyncMessage = {
      type: 'DRAFT_UPDATED',
      timestamp: Date.now(),
      senderId: 'peer-tab-abc',
      payload: {
        config: { scrambled: 2, toast: 1 },
      },
    };

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'smart_order_builder_sync_event',
        newValue: JSON.stringify(peerMessage),
      })
    );

    // UI immediately updates in real time to reflect the peer tab's draft
    rerender(
      <OrderBuilder
        menu={mockMenu}
        availableStock={MENU_FIXTURE.ingredientStock}
        onAddToCart={vi.fn()}
      />
    );

    expect(screen.getByText(/2× Scrambled/i)).toBeInTheDocument();
    expect(screen.getByTestId('qty-scrambled')).toHaveTextContent('2');
  });
});
