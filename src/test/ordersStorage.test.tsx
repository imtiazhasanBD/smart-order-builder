import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { serverStore } from '@/mocks/serverStore';
import { OrdersView } from '@/features/orders/OrdersView';

describe('Step 07: Checkout, Order Storage, and JSON Export (TC-16, TC-17, D6)', () => {
  beforeEach(() => {
    serverStore.reset();
  });

  it('TC-17: Refresh after checkout, Download orders.json retains orders in documented D6 shape', () => {
    // 1. Setup item in cart and checkout
    const config = { toast: 1, scrambled: 2, sausage: 1 };
    serverStore.reserveItem('checkout-item', config, 1);
    const checkoutRes = serverStore.checkout('chk-17', 'bkash', 'MORNING15');
    expect(checkoutRes.success).toBe(true);

    // 2. Fetch all orders (6 seed orders + 1 newly placed order = 7)
    const allOrders = serverStore.getOrders();
    expect(allOrders.length).toBe(7);

    const latestOrder = allOrders[0]; // unshifted as latest order
    expect(latestOrder).toHaveProperty('id');
    expect(latestOrder).toHaveProperty('createdAt');
    expect(latestOrder).toHaveProperty('paymentMethod', 'bkash');
    expect(latestOrder).toHaveProperty('lines');
    expect(latestOrder).toHaveProperty('pricing');
    expect(latestOrder.pricing).toHaveProperty('cartSubtotalPoisha');
    expect(latestOrder.pricing).toHaveProperty('cartSubtotalBDT');
    expect(latestOrder.pricing).toHaveProperty('appliedDiscount');
    expect(latestOrder.pricing).toHaveProperty('couponStatus');
    expect(latestOrder.pricing).toHaveProperty('vatPoisha');
    expect(latestOrder.pricing).toHaveProperty('payableBDT');
    expect(latestOrder.pricing?.currency).toBe('BDT');

    // 3. Validate that serializing to JSON and re-parsing retains full fidelity
    const jsonString = JSON.stringify(allOrders, null, 2);
    const parsed = JSON.parse(jsonString);
    expect(parsed.length).toBe(7);
    expect(parsed[0].id).toBe(latestOrder.id);
  });

  it('OrdersView component renders orders and triggers JSON download blob', () => {
    const allOrders = serverStore.getOrders();
    expect(allOrders.length).toBe(6);

    // Spy on document.createElement to intercept anchor click
    const clickSpy = vi.fn();
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
      const el = originalCreateElement(tagName);
      if (tagName.toLowerCase() === 'a') {
        el.click = clickSpy;
      }
      return el;
    });

    render(<OrdersView orders={allOrders} />);

    // Check header and cards
    expect(screen.getByText(/Completed Orders \(6\)/i)).toBeInTheDocument();
    expect(screen.getByTestId('download-orders-json-button')).toBeInTheDocument();

    // Verify seed order cards are listed (page 1)
    expect(screen.getByTestId(`order-card-${allOrders[0].id}`)).toBeInTheDocument();

    // Click Download button
    fireEvent.click(screen.getByTestId('download-orders-json-button'));
    expect(clickSpy).toHaveBeenCalledTimes(1);

    vi.restoreAllMocks();
  });

  it('paginates orders and navigates between pages', () => {
    const allOrders = serverStore.getOrders(); // 6 orders
    render(<OrdersView orders={allOrders} defaultPageSize={5} />);

    // Page 1 should show first 5 orders
    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 1 to 5 of 6 orders');
    expect(screen.getByTestId('pagination-prev')).toBeDisabled();
    expect(screen.getByTestId('pagination-first')).toBeDisabled();
    expect(screen.getByTestId('pagination-next')).not.toBeDisabled();
    expect(screen.getByTestId(`order-card-${allOrders[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`order-card-${allOrders[4].id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`order-card-${allOrders[5].id}`)).not.toBeInTheDocument();

    // Navigate to Page 2
    fireEvent.click(screen.getByTestId('pagination-next'));

    // Page 2 should show 6th order
    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 6 to 6 of 6 orders');
    expect(screen.getByTestId('pagination-next')).toBeDisabled();
    expect(screen.getByTestId('pagination-last')).toBeDisabled();
    expect(screen.getByTestId('pagination-prev')).not.toBeDisabled();
    expect(screen.getByTestId(`order-card-${allOrders[5].id}`)).toBeInTheDocument();
    expect(screen.queryByTestId(`order-card-${allOrders[0].id}`)).not.toBeInTheDocument();

    // Navigate back to Page 1 via page button
    fireEvent.click(screen.getByTestId('pagination-page-1'));
    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 1 to 5 of 6 orders');
    expect(screen.getByTestId(`order-card-${allOrders[0].id}`)).toBeInTheDocument();
  });

  it('updates items per page when page size selector changes', () => {
    const allOrders = serverStore.getOrders(); // 6 orders
    render(<OrdersView orders={allOrders} defaultPageSize={5} />);

    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 1 to 5 of 6 orders');

    // Change page size to 10
    const select = screen.getByTestId('page-size-select');
    fireEvent.change(select, { target: { value: '10' } });

    // All 6 orders should now be shown on a single page
    expect(screen.getByTestId('pagination-info')).toHaveTextContent('Showing 1 to 6 of 6 orders');
    expect(screen.getByTestId(`order-card-${allOrders[0].id}`)).toBeInTheDocument();
    expect(screen.getByTestId(`order-card-${allOrders[5].id}`)).toBeInTheDocument();
    // Navigation buttons hidden because totalPages === 1
    expect(screen.queryByTestId('pagination-next')).not.toBeInTheDocument();
  });

  it('OrdersView renders empty state when no orders exist', () => {
    const onSwitchToBuilder = vi.fn();
    render(<OrdersView orders={[]} onSwitchToBuilder={onSwitchToBuilder} />);

    expect(screen.getByText(/No Orders Placed Yet/i)).toBeInTheDocument();
    const buildBtn = screen.getByRole('button', { name: /Build a Breakfast/i });
    expect(buildBtn).toBeInTheDocument();

    fireEvent.click(buildBtn);
    expect(onSwitchToBuilder).toHaveBeenCalledTimes(1);
  });
});
