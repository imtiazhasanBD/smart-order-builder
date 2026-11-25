import { http, HttpResponse } from 'msw';
import { serverStore } from '../serverStore';
import { PaymentMethod, SelectedOptions } from '@/types';

export const cartHandlers = [
  // 1. Get current cart snapshot and countdowns
  http.get('/api/cart', () => {
    return HttpResponse.json(serverStore.getCartSnapshot());
  }),

  // 2. Reserve item (all-or-nothing atomic reservation with Idempotency-Key)
  http.post('/api/cart/reserve', async ({ request }) => {
    const idempotencyKey =
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key') ||
      '';

    const body = (await request.json()) as {
      idempotencyKey?: string;
      options: SelectedOptions;
      qty: number;
      version?: number;
    };

    const key = idempotencyKey || body.idempotencyKey || '';
    const result = serverStore.reserveItem(
      key,
      body.options,
      body.qty || 1,
      body.version
    );

    if (!result.success) {
      const status = result.conflict ? 409 : 409; // Insufficient stock rejects with 409 Conflict (TC-14)
      return HttpResponse.json(result, { status });
    }

    return HttpResponse.json(result);
  }),

  // 3. Update cart item (net-difference rule)
  http.put('/api/cart/items/:id', async ({ params, request }) => {
    const itemId = params.id as string;
    const body = (await request.json()) as {
      options: SelectedOptions;
      qty: number;
      version?: number;
    };

    const result = serverStore.updateItem(
      itemId,
      body.options,
      body.qty || 1,
      body.version
    );

    if (!result.success) {
      const status = result.conflict ? 409 : 409;
      return HttpResponse.json(result, { status });
    }

    return HttpResponse.json(result);
  }),

  // 4. Remove cart item (releases reserved stock)
  http.delete('/api/cart/items/:id', async ({ params, request }) => {
    const itemId = params.id as string;
    const url = new URL(request.url);
    const versionParam = url.searchParams.get('version');
    const version = versionParam ? parseInt(versionParam, 10) : undefined;

    const result = serverStore.removeItem(itemId, version);
    return HttpResponse.json(result);
  }),

  // 5. Checkout / Pay (converts reservations to permanent sold stock, TC-16)
  http.post('/api/checkout', async ({ request }) => {
    const idempotencyKey =
      request.headers.get('idempotency-key') ||
      request.headers.get('x-idempotency-key') ||
      '';

    const body = (await request.json()) as {
      idempotencyKey?: string;
      paymentMethod: PaymentMethod;
      couponCode?: string | null;
      version?: number;
    };

    const key = idempotencyKey || body.idempotencyKey || '';
    const result = serverStore.checkout(
      key,
      body.paymentMethod,
      body.couponCode,
      body.version
    );

    if (!result.success) {
      const status = result.conflict ? 409 : 400;
      return HttpResponse.json(result, { status });
    }

    return HttpResponse.json(result);
  }),

  // 6. Get completed orders
  http.get('/api/orders', () => {
    return HttpResponse.json({
      orders: serverStore.getOrders(),
    });
  }),
];
