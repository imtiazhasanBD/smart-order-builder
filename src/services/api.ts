import {
  MenuResponse,
  PaymentMethod,
  SelectedOptions,
  StoredOrder,
} from '@/types';
import { CartReservationItem, ReserveResult, CheckoutResult } from '@/mocks/serverStore';

export interface ServerTimeResponse {
  serverTime: string;
  serverOffsetMs: number;
}

export interface CartResponse {
  version: number;
  items: CartReservationItem[];
  serverTime: string;
  remainingStock: Record<string, number>;
}

export interface OrdersResponse {
  orders: StoredOrder[];
}

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

export async function fetchMenu(): Promise<MenuResponse> {
  const response = await fetch('/api/menu');
  if (!response.ok) {
    throw new ApiError(`Failed to fetch menu: ${response.status}`, response.status);
  }
  return response.json();
}

export async function fetchServerTime(): Promise<ServerTimeResponse> {
  const response = await fetch('/api/time');
  if (!response.ok) {
    throw new ApiError(`Failed to fetch server time: ${response.status}`, response.status);
  }
  return response.json();
}

export async function fetchCart(): Promise<CartResponse> {
  const response = await fetch('/api/cart');
  if (!response.ok) {
    throw new ApiError(`Failed to fetch cart: ${response.status}`, response.status);
  }
  return response.json();
}

export async function reserveCartItem(
  idempotencyKey: string,
  options: SelectedOptions,
  qty: number,
  version?: number
): Promise<ReserveResult> {
  const response = await fetch('/api/cart/reserve', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      idempotencyKey,
      options,
      qty,
      version,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.error || 'Failed to reserve cart item', response.status, data);
  }
  return data;
}

export async function updateCartItem(
  itemId: string,
  options: SelectedOptions,
  qty: number,
  version?: number
): Promise<ReserveResult> {
  const response = await fetch(`/api/cart/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      options,
      qty,
      version,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.error || 'Failed to update cart item', response.status, data);
  }
  return data;
}

export async function removeCartItem(
  itemId: string,
  version?: number
): Promise<{ success: boolean; version: number }> {
  const url = version !== undefined ? `/api/cart/items/${itemId}?version=${version}` : `/api/cart/items/${itemId}`;
  const response = await fetch(url, {
    method: 'DELETE',
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError('Failed to remove cart item', response.status, data);
  }
  return data;
}

export async function checkout(
  idempotencyKey: string,
  paymentMethod: PaymentMethod,
  couponCode?: string | null,
  version?: number
): Promise<CheckoutResult> {
  const response = await fetch('/api/checkout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': idempotencyKey,
    },
    body: JSON.stringify({
      idempotencyKey,
      paymentMethod,
      couponCode,
      version,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new ApiError(data.error || 'Checkout failed', response.status, data);
  }
  return data;
}

export async function fetchOrders(): Promise<OrdersResponse> {
  const response = await fetch('/api/orders');
  if (!response.ok) {
    throw new ApiError(`Failed to fetch orders: ${response.status}`, response.status);
  }
  return response.json();
}
