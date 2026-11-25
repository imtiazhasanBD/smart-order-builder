import { MENU_FIXTURE } from './data/menu';
import seedData from './data/orders.seed.json';
import { SeedOrdersPayload } from '@/types';

// The mock server's clock runs 90 seconds ahead of the browser clock
export const SERVER_OFFSET_MS = 90 * 1000;

export class MockServerStore {
  private static instance: MockServerStore;
  private ingredientStock: Record<string, number>;
  private seedOrders: SeedOrdersPayload;

  private constructor() {
    this.ingredientStock = { ...MENU_FIXTURE.ingredientStock };
    this.seedOrders = seedData as SeedOrdersPayload;
  }

  public static getInstance(): MockServerStore {
    if (!MockServerStore.instance) {
      MockServerStore.instance = new MockServerStore();
    }
    return MockServerStore.instance;
  }

  // Authoritative server timestamp (90s ahead)
  public getServerTime(): string {
    const serverTimeMs = Date.now() + SERVER_OFFSET_MS;
    return new Date(serverTimeMs).toISOString();
  }

  public getIngredientStock(): Record<string, number> {
    return { ...this.ingredientStock };
  }

  public getSeedOrders(): SeedOrdersPayload {
    return this.seedOrders;
  }

  public reset(): void {
    this.ingredientStock = { ...MENU_FIXTURE.ingredientStock };
    this.seedOrders = seedData as SeedOrdersPayload;
  }
}

export const serverStore = MockServerStore.getInstance();
