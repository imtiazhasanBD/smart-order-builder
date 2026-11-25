import {
  CartLine,
  MenuResponse,
  OptionItem,
  PaymentMethod,
  SelectedOptions,
  StoredOrder,
} from '@/types';
import { MENU_FIXTURE } from './data/menu';
import { buildOptionLookup } from '@/engines/inventory';
import { priceCart } from '@/engines/pricing';
import seedData from './data/orders.seed.json';

// The mock server's clock runs 90 seconds ahead of the browser clock
export const SERVER_OFFSET_MS = 90 * 1000;

export interface CartReservationItem {
  id: string;
  qty: number;
  options: SelectedOptions;
  reservedAtServerTime: string;
  reservedUntilServerTime: string;
  isExpired: boolean;
  consumedIngredients: Record<string, number>;
}

export interface ReserveResult {
  success: boolean;
  item?: CartReservationItem;
  error?: string;
  shortages?: Record<string, number>;
  version: number;
  conflict?: boolean;
}

export interface CheckoutResult {
  success: boolean;
  order?: StoredOrder;
  error?: string;
  version: number;
  conflict?: boolean;
}

const STORAGE_ORDERS_KEY = 'smart_order_builder_orders_v1';

export class MockServerStore {
  private static instance: MockServerStore;
  private menu: MenuResponse;
  private cartVersion: number = 1;
  private cartItems: Map<string, CartReservationItem> = new Map();
  private idempotencyKeys: Map<string, { result: any; createdAt: number }> = new Map();
  private orders: StoredOrder[] = [];
  private soldStock: Record<string, number> = {};
  private optionLookup: Map<string, OptionItem>;

  private constructor() {
    this.menu = JSON.parse(JSON.stringify(MENU_FIXTURE));
    this.optionLookup = buildOptionLookup(this.menu.groups);
    this.initOrders();
  }

  public static getInstance(): MockServerStore {
    if (!MockServerStore.instance) {
      MockServerStore.instance = new MockServerStore();
    }
    return MockServerStore.instance;
  }

  // Authoritative server timestamp (90s ahead)
  public getServerTime(): Date {
    return new Date(Date.now() + SERVER_OFFSET_MS);
  }

  public getServerTimeISO(): string {
    return this.getServerTime().toISOString();
  }

  private initOrders(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const cached = window.localStorage.getItem(STORAGE_ORDERS_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            this.orders = parsed;
            return;
          }
        }
      }
    } catch {
      // Ignore in non-browser test environments
    }

    // Initialize past orders from seed data, pricing them with their createdAt timestamp
    const seedPayload = seedData as { orders: any[] };
    this.orders = seedPayload.orders.map((seed) => {
      const cartLines: CartLine[] = seed.lines.map((l: any, idx: number) => ({
        id: `seed-${seed.id}-${idx}`,
        qty: l.qty,
        options: { ...l.options },
      }));

      const pricing = priceCart(
        cartLines,
        this.menu,
        this.menu.promotions,
        seed.createdAt,
        seed.couponCode
      );

      const stored: StoredOrder = {
        id: seed.id,
        createdAt: seed.createdAt,
        paymentMethod: seed.paymentMethod as PaymentMethod,
        couponCode: seed.couponCode,
        lines: seed.lines.map((l: any, idx: number) => ({
          itemId: `seed-${seed.id}-${idx}`,
          qty: l.qty,
          options: { ...l.options },
          unitPricePoisha: pricing.unitSubtotalPoisha,
          unitPriceBDT: pricing.finalUnitPriceBDT,
          lineTotalPoisha: pricing.unitSubtotalPoisha * l.qty,
          lineTotalBDT: pricing.finalUnitPriceBDT * l.qty,
        })),
        pricing,
      };

      return stored;
    });

    this.persistOrders();
  }

  private persistOrders(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(STORAGE_ORDERS_KEY, JSON.stringify(this.orders));
      }
    } catch {
      // Ignore
    }
  }

  public getMenu(): MenuResponse {
    return {
      ...this.menu,
      ingredientStock: this.getAvailableStock(),
      serverTime: this.getServerTimeISO(),
    };
  }

  public getOrders(): StoredOrder[] {
    return [...this.orders];
  }

  // Sweeps and automatically releases expired reservations (5-minute lifecycle).
  public sweepExpiredReservations(): void {
    const nowMs = this.getServerTime().getTime();
    for (const item of this.cartItems.values()) {
      const expMs = new Date(item.reservedUntilServerTime).getTime();
      if (nowMs > expMs && !item.isExpired) {
        item.isExpired = true;
      }
    }
  }

// geting stock for order builder
  public getIngredientStock(): Record<string, number> {
    return this.getAvailableStock();
  }
// get available stock for order builder
  public getAvailableStock(excludeItemId?: string): Record<string, number> {
    this.sweepExpiredReservations();

    const reserved: Record<string, number> = {};
    for (const item of this.cartItems.values()) {
      if (item.isExpired) continue;
      if (excludeItemId && item.id === excludeItemId) continue;

      for (const [ing, count] of Object.entries(item.consumedIngredients)) {
        reserved[ing] = (reserved[ing] || 0) + count;
      }
    }

    const available: Record<string, number> = {};
    for (const [ing, total] of Object.entries(this.menu.ingredientStock)) {
      const sold = this.soldStock[ing] || 0;
      const res = reserved[ing] || 0;
      available[ing] = Math.max(0, total - sold - res);
    }

    return available;
  }

  // Calculates total ingredients consumed by a given options configuration and quantity.
  public calculateConsumedIngredients(
    options: SelectedOptions,
    qty: number
  ): Record<string, number> {
    const consumed: Record<string, number> = {};
    for (const [optId, count] of Object.entries(options)) {
      if (count <= 0) continue;
      const opt = this.optionLookup.get(optId);
      if (!opt) continue;
      for (const [ing, amt] of Object.entries(opt.ingredients)) {
        consumed[ing] = (consumed[ing] || 0) + amt * count * qty;
      }
    }
    return consumed;
  }

  // Returns active cart snapshot
  public getCartSnapshot() {
    this.sweepExpiredReservations();
    const items = Array.from(this.cartItems.values()).map((item) => ({
      ...item,
    }));

    return {
      version: this.cartVersion,
      items,
      serverTime: this.getServerTimeISO(),
      remainingStock: this.getAvailableStock(),
    };
  }

  // Atomically reserves stock for a new cart item
  public reserveItem(
    idempotencyKey: string,
    options: SelectedOptions,
    qty: number,
    clientVersion?: number
  ): ReserveResult {
    // 1. Check idempotency cache (TC-13)
    if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
      return this.idempotencyKeys.get(idempotencyKey)!.result;
    }

    // 2. Multi-tab version conflict check (Part G)
    if (clientVersion !== undefined && clientVersion < this.cartVersion) {
      return {
        success: false,
        conflict: true,
        error: 'Cart has been modified in another session. Please reload.',
        version: this.cartVersion,
      };
    }

    this.sweepExpiredReservations();
    const available = this.getAvailableStock();
    const needed = this.calculateConsumedIngredients(options, qty);
    const shortages: Record<string, number> = {};

    // 3. Atomic all-or-nothing stock verification (TC-14)
    for (const [ing, reqAmt] of Object.entries(needed)) {
      const avail = available[ing] !== undefined ? available[ing] : Infinity;
      if (reqAmt > avail) {
        shortages[ing] = reqAmt - avail;
      }
    }

    if (Object.keys(shortages).length > 0) {
      const parts = Object.entries(shortages).map(([k, v]) => `${v} ${k}`);
      const result: ReserveResult = {
        success: false,
        error: `Short: ${parts.join(', ')}`,
        shortages,
        version: this.cartVersion,
      };
      if (idempotencyKey) {
        this.idempotencyKeys.set(idempotencyKey, { result, createdAt: Date.now() });
      }
      return result;
    }

    // 4. Create 5-minute atomic reservation (TC-15)
    const serverNow = this.getServerTime();
    const expiryTime = new Date(serverNow.getTime() + 5 * 60 * 1000); // 5 minutes

    const newItem: CartReservationItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      qty,
      options: { ...options },
      reservedAtServerTime: serverNow.toISOString(),
      reservedUntilServerTime: expiryTime.toISOString(),
      isExpired: false,
      consumedIngredients: needed,
    };

    this.cartItems.set(newItem.id, newItem);
    this.cartVersion += 1;

    const result: ReserveResult = {
      success: true,
      item: newItem,
      version: this.cartVersion,
    };

    if (idempotencyKey) {
      this.idempotencyKeys.set(idempotencyKey, { result, createdAt: Date.now() });
    }

    return result;
  }

  // Atomically updates an existing item 
  public updateItem(
    itemId: string,
    options: SelectedOptions,
    qty: number,
    clientVersion?: number
  ): ReserveResult {
    if (clientVersion !== undefined && clientVersion < this.cartVersion) {
      return {
        success: false,
        conflict: true,
        error: 'Cart modified in another session.',
        version: this.cartVersion,
      };
    }

    const currentItem = this.cartItems.get(itemId);
    if (!currentItem) {
      return { success: false, error: 'Item not found in cart', version: this.cartVersion };
    }

    this.sweepExpiredReservations();

    // Available stock
    const available = this.getAvailableStock(itemId);
    const needed = this.calculateConsumedIngredients(options, qty);
    const shortages: Record<string, number> = {};

    for (const [ing, reqAmt] of Object.entries(needed)) {
      const avail = available[ing] !== undefined ? available[ing] : Infinity;
      if (reqAmt > avail) {
        shortages[ing] = reqAmt - avail;
      }
    }

    if (Object.keys(shortages).length > 0) {
      const parts = Object.entries(shortages).map(([k, v]) => `${v} ${k}`);
      return {
        success: false,
        error: `Short: ${parts.join(', ')}`,
        shortages,
        version: this.cartVersion,
      };
    }

    // Refresh 5-minute reservation
    const serverNow = this.getServerTime();
    const expiryTime = new Date(serverNow.getTime() + 5 * 60 * 1000);

    currentItem.options = { ...options };
    currentItem.qty = qty;
    currentItem.consumedIngredients = needed;
    currentItem.reservedAtServerTime = serverNow.toISOString();
    currentItem.reservedUntilServerTime = expiryTime.toISOString();
    currentItem.isExpired = false;

    this.cartVersion += 1;

    return {
      success: true,
      item: currentItem,
      version: this.cartVersion,
    };
  }

  // Removes an item from cart and releases reserved stock
  public removeItem(itemId: string, clientVersion?: number): { success: boolean; version: number } {
    if (clientVersion !== undefined && clientVersion < this.cartVersion) {
      // Allow remove but advance version
    }

    this.cartItems.delete(itemId);
    this.cartVersion += 1;

    return {
      success: true,
      version: this.cartVersion,
    };
  }

  // Executes checkout, converting active reservations to permanently sold stock
  public checkout(
    idempotencyKey: string,
    paymentMethod: PaymentMethod,
    couponCode?: string | null,
    clientVersion?: number
  ): CheckoutResult {
    if (idempotencyKey && this.idempotencyKeys.has(idempotencyKey)) {
      return this.idempotencyKeys.get(idempotencyKey)!.result;
    }

    if (clientVersion !== undefined && clientVersion < this.cartVersion) {
      return {
        success: false,
        conflict: true,
        error: 'Cart was modified in another session. Please review before payment.',
        version: this.cartVersion,
      };
    }

    this.sweepExpiredReservations();

    const activeItems = Array.from(this.cartItems.values()).filter((i) => !i.isExpired);
    if (activeItems.length === 0) {
      return {
        success: false,
        error: 'No active reservations to checkout. Items may have expired.',
        version: this.cartVersion,
      };
    }

    const serverNow = this.getServerTime();
    const cartLines: CartLine[] = activeItems.map((item) => ({
      id: item.id,
      qty: item.qty,
      options: { ...item.options },
    }));

    // Calculate final authoritative checkout pricing
    const pricing = priceCart(
      cartLines,
      this.menu,
      this.menu.promotions,
      serverNow,
      couponCode
    );

    // Convert reserved stock into permanently sold stock
    for (const item of activeItems) {
      for (const [ing, count] of Object.entries(item.consumedIngredients)) {
        this.soldStock[ing] = (this.soldStock[ing] || 0) + count;
      }
    }

    const newOrder: StoredOrder = {
      id: `ord-${serverNow.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      createdAt: serverNow.toISOString(),
      paymentMethod,
      couponCode: couponCode || null,
      lines: activeItems.map((item) => ({
        itemId: item.id,
        qty: item.qty,
        options: { ...item.options },
        unitPricePoisha: pricing.unitSubtotalPoisha,
        unitPriceBDT: pricing.finalUnitPriceBDT,
        lineTotalPoisha: pricing.unitSubtotalPoisha * item.qty,
        lineTotalBDT: pricing.finalUnitPriceBDT * item.qty,
      })),
      pricing,
    };

    // Save order and empty cart
    this.orders.unshift(newOrder);
    this.persistOrders();
    this.cartItems.clear();
    this.cartVersion += 1;

    const result: CheckoutResult = {
      success: true,
      order: newOrder,
      version: this.cartVersion,
    };

    if (idempotencyKey) {
      this.idempotencyKeys.set(idempotencyKey, { result, createdAt: Date.now() });
    }

    return result;
  }

  public reset(): void {
    this.menu = JSON.parse(JSON.stringify(MENU_FIXTURE));
    this.cartVersion = 1;
    this.cartItems.clear();
    this.idempotencyKeys.clear();
    this.soldStock = {};
    this.optionLookup = buildOptionLookup(this.menu.groups);
    this.initOrders();
  }
}

export const serverStore = MockServerStore.getInstance();
