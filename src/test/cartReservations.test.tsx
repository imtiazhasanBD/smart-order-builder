import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { serverStore } from '@/mocks/serverStore';
import { Cart } from '@/features/cart/Cart';
import { MENU_FIXTURE } from '@/mocks/data/menu';

describe('Step 06: Cart & Reservation Lifecycle Tests (TC-13, TC-14, TC-15, TC-16)', () => {
  beforeEach(() => {
    serverStore.reset();
    vi.restoreAllMocks();
  });

  it('TC-13: Rapid repeated clicks on Add to Cart with identical Idempotency-Key create exactly one cart item and reservation', () => {
    const idempotencyKey = 'triple-click-key-123';
    const config = { toast: 1, scrambled: 2, sausage: 1 };

    // Fire 3 simultaneous reserve calls with the exact same idempotency key
    const res1 = serverStore.reserveItem(idempotencyKey, config, 1);
    const res2 = serverStore.reserveItem(idempotencyKey, config, 1);
    const res3 = serverStore.reserveItem(idempotencyKey, config, 1);

    expect(res1.success).toBe(true);
    expect(res2.success).toBe(true);
    expect(res3.success).toBe(true);

    // Only one item and one reservation in the store
    const snapshot = serverStore.getCartSnapshot();
    expect(snapshot.items.length).toBe(1);
    expect(res1.item?.id).toBe(res2.item?.id);
    expect(res2.item?.id).toBe(res3.item?.id);

    // Consumed ingredients for (toast: 1, scrambled: 2, sausage: 1) = 1 toast, 2 eggs, 1 sausage
    expect(snapshot.remainingStock['toast']).toBe(19);
    expect(snapshot.remainingStock['egg']).toBe(8);
    expect(snapshot.remainingStock['sausage']).toBe(3);
  });

  it('TC-14: Mid-way reservation failure (insufficient stock) allocates zero stock (atomic all-or-nothing), preserves configuration, and allows clean retry', () => {
    // Attempt to reserve 999 eggs (impossible stock)
    const impossibleConfig = { scrambled: 999 };
    const failedRes = serverStore.reserveItem('fail-key', impossibleConfig, 1);

    expect(failedRes.success).toBe(false);
    expect(failedRes.error).toContain('Short:');

    // Verify 0 phantom reservations exist and egg stock remains untouched at 10
    const snapshot = serverStore.getCartSnapshot();
    expect(snapshot.items.length).toBe(0);
    expect(snapshot.remainingStock['egg']).toBe(10);

    // Retry with a valid configuration works cleanly
    const validConfig = { toast: 1, scrambled: 2, sausage: 1 };
    const retryRes = serverStore.reserveItem('retry-key', validConfig, 1);
    expect(retryRes.success).toBe(true);
    expect(serverStore.getCartSnapshot().items.length).toBe(1);
    expect(serverStore.getCartSnapshot().remainingStock['egg']).toBe(8);
  });

  it('TC-15: Clock advancing past 5 minutes releases reserved stock back to available pool and marks item read-only', () => {
    const config = { toast: 1, scrambled: 2, sausage: 1 };
    const res = serverStore.reserveItem('exp-key', config, 1);
    expect(res.success).toBe(true);

    const initialStock = serverStore.getAvailableStock();
    expect(initialStock['egg']).toBe(8); // 10 - 2 = 8

    // Read item expiry timestamp
    const item = serverStore.getCartSnapshot().items[0];
    const expiryDate = new Date(item.reservedUntilServerTime);

    // Fast-forward server clock past expiry (+5 seconds)
    const simulatedNow = new Date(expiryDate.getTime() + 5000);
    vi.spyOn(serverStore, 'getServerTime').mockReturnValue(simulatedNow);

    // Stock must be released automatically
    const stockAfterExpiry = serverStore.getAvailableStock();
    expect(stockAfterExpiry['egg']).toBe(10); // released back to initial pool

    const snapshot = serverStore.getCartSnapshot();
    expect(snapshot.items[0].isExpired).toBe(true);

    // Client offset to match simulated server time
    const clientOffsetMs = simulatedNow.getTime() - Date.now();

    // Verify UI reflects read-only expired state
    const onEditItem = vi.fn();
    const onRemoveItem = vi.fn();
    const onCheckout = vi.fn();

    render(
      <Cart
        menu={{ ...MENU_FIXTURE, serverTime: simulatedNow.toISOString() }}
        cartItems={snapshot.items}
        cartVersion={snapshot.version}
        serverOffsetMs={clientOffsetMs}
        onEditItem={onEditItem}
        onRemoveItem={onRemoveItem}
        onCheckout={onCheckout}
        onSwitchToBuilder={vi.fn()}
      />
    );

    // Verify expired badge is rendered and Edit button is disabled
    expect(screen.getByTestId(`expired-badge-${item.id}`)).toBeInTheDocument();
    expect(screen.getByText(/Expired \(Stock Released\)/i)).toBeInTheDocument();

    const editBtn = screen.getByRole('button', { name: /Edit/i });
    expect(editBtn).toBeDisabled();
  });

  it('TC-16: Pay clicked twice quickly creates exactly one order, cart empty, sold stock not released', () => {
    const config = { toast: 1, scrambled: 2, sausage: 1 };
    serverStore.reserveItem('item-1', config, 1);

    const idempotencyKey = 'pay-double-click-key';

    // Click pay twice with identical idempotency key
    const pay1 = serverStore.checkout(idempotencyKey, 'card', null);
    const pay2 = serverStore.checkout(idempotencyKey, 'card', null);

    expect(pay1.success).toBe(true);
    expect(pay2.success).toBe(true);
    expect(pay1.order?.id).toBe(pay2.order?.id);

    // Cart is now empty
    const cartSnapshot = serverStore.getCartSnapshot();
    expect(cartSnapshot.items.length).toBe(0);

    // Sold stock is permanently deducted (toast 19, egg 8, sausage 3)
    const available = serverStore.getAvailableStock();
    expect(available['toast']).toBe(19);
    expect(available['egg']).toBe(8);
    expect(available['sausage']).toBe(3);
  });
});
