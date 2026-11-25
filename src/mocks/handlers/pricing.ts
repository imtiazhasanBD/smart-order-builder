import { http, HttpResponse, delay } from 'msw';
import { MENU_FIXTURE } from '../data/menu';
import { serverStore } from '../serverStore';
import { priceCart } from '@/engines/pricing';
import { CartLine } from '@/types';

export interface PriceRequestPayload {
  lines: CartLine[];
  couponCode?: string | null;
  requestId?: string;
  skipSimulation?: boolean;
}

export const pricingHandlers = [
  http.post('/api/price', async ({ request }) => {
    const body = (await request.json()) as PriceRequestPayload;
    const { lines, couponCode, requestId, skipSimulation } = body;

    const isTestMode =
      skipSimulation ||
      request.headers.get('x-test-mode') === 'true' ||
      process.env.NODE_ENV === 'test';

    if (!isTestMode) {
      // Simulated latency 200 - 1500 ms
      const randomLatency = Math.floor(Math.random() * 1300) + 200;
      await delay(randomLatency);

      // 15% simulated random failure rate
      if (Math.random() < 0.15) {
        return HttpResponse.json(
          { message: 'Simulated pricing calculation failure' },
          { status: 500 }
        );
      }
    }

    const serverTime = serverStore.getServerTime();
    const pricing = priceCart(
      lines,
      MENU_FIXTURE,
      MENU_FIXTURE.promotions,
      serverTime,
      couponCode
    );

    return HttpResponse.json({
      pricing,
      serverTime,
      requestId,
    });
  }),
];
