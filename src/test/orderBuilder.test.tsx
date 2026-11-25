import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, renderHook, act } from '@testing-library/react';
import { OrderBuilder } from '@/features/configurator/OrderBuilder';
import { usePricePreview } from '@/features/configurator/usePricePreview';
import { MENU_FIXTURE } from '@/mocks/data/menu';
import { MenuResponse } from '@/types';
import { server } from '@/mocks/server';
import { http, HttpResponse, delay } from 'msw';

const mockMenu: MenuResponse = {
  ...MENU_FIXTURE,
  serverTime: '2026-11-20T10:00:00+06:00',
};

describe('Step 05 - Order Builder UI & TC-12 Price Race Condition', () => {
  beforeEach(() => {
    localStorage.clear();
  });
  it('renders dynamic groups and keeps Add to Cart disabled while invalid', () => {
    const handleAddToCart = vi.fn();

    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={mockMenu.ingredientStock}
        onAddToCart={handleAddToCart}
        skipDebounceForTest={true}
      />
    );

    // Dynamic groups rendered
    expect(screen.getByTestId('group-bread')).toBeInTheDocument();
    expect(screen.getByTestId('group-eggs')).toBeInTheDocument();
    expect(screen.getByTestId('group-protein')).toBeInTheDocument();

    // Add to Cart must be disabled on empty configuration (min group limits broken)
    const addBtn = screen.getByTestId('add-to-cart-button');
    expect(addBtn).toBeDisabled();

    // Base starting price is clearly displayed instead of confusing "Calculating..."
    const priceElem = screen.getByTestId('preview-unit-price');
    expect(priceElem).toHaveTextContent(`${mockMenu.basePriceBDT.toFixed(2)} BDT`);
    expect(screen.getByText('(Base price)')).toBeInTheDocument();
  });

  it('TC-01 in UI: Scrambled x3 displays violation and disables Add to Cart', async () => {
    const handleAddToCart = vi.fn();

    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={mockMenu.ingredientStock}
        onAddToCart={handleAddToCart}
        skipDebounceForTest={true}
      />
    );

    // Select Toast x1
    const toastIncreaseBtn = screen.getByRole('button', { name: /increase toast/i });
    fireEvent.click(toastIncreaseBtn);

    // Select Scrambled x3
    const scrambledIncreaseBtn = screen.getByRole('button', { name: /increase scrambled/i });
    fireEvent.click(scrambledIncreaseBtn);
    fireEvent.click(scrambledIncreaseBtn);
    fireEvent.click(scrambledIncreaseBtn);

    // Select Sausage x1
    const sausageIncreaseBtn = screen.getByRole('button', { name: /increase chicken sausage/i });
    fireEvent.click(sausageIncreaseBtn);

    // Verify violation alert is shown
    expect(
      screen.getByText(/eggs total must be 2-6 in steps of 2/i)
    ).toBeInTheDocument();

    const addBtn = screen.getByTestId('add-to-cart-button');
    expect(addBtn).toBeDisabled();
  });

  it('TC-02 in UI: Croissant + 3 extras triggers override alert', async () => {
    const handleAddToCart = vi.fn();

    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={mockMenu.ingredientStock}
        onAddToCart={handleAddToCart}
        skipDebounceForTest={true}
      />
    );

    // Select Croissant
    fireEvent.click(screen.getByRole('button', { name: /increase croissant/i }));
    // Valid eggs & protein
    fireEvent.click(screen.getByRole('button', { name: /increase scrambled/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase scrambled/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase chicken sausage/i }));

    // Add 3 extras: 1 hashbrown, 1 mushroom, 1 baked beans
    fireEvent.click(screen.getByRole('button', { name: /increase hash brown/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase mushroom/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase baked beans/i }));

    // Verify override limit message
    expect(
      screen.getByText(/extras max is 2 when croissant is selected/i)
    ).toBeInTheDocument();

    expect(screen.getByTestId('add-to-cart-button')).toBeDisabled();
  });

  it('disables add button when option stock is depleted to 0', async () => {
    const handleAddToCart = vi.fn();
    // Croissant has initial stock of 2
    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={mockMenu.ingredientStock}
        onAddToCart={handleAddToCart}
        skipDebounceForTest={true}
      />
    );

    const croissantPlus = screen.getByRole('button', { name: /increase croissant/i });
    expect(croissantPlus).not.toBeDisabled();

    // Click 1 -> 1 remaining
    fireEvent.click(croissantPlus);
    expect(croissantPlus).not.toBeDisabled();

    // Click 2 -> 0 remaining
    fireEvent.click(croissantPlus);
    // Button must now be disabled at 0 remaining
    expect(croissantPlus).toBeDisabled();
  });

  it('enables Add to Cart on valid configuration (Item A) and computes price', async () => {
    const handleAddToCart = vi.fn();

    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={mockMenu.ingredientStock}
        onAddToCart={handleAddToCart}
        skipDebounceForTest={true}
      />
    );

    // Item A: Toast x1, Scrambled x2, Sausage x1, Ketchup x1
    fireEvent.click(screen.getByRole('button', { name: /increase toast/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase scrambled/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase scrambled/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase chicken sausage/i }));
    fireEvent.click(screen.getByRole('button', { name: /increase ketchup/i }));

    // Wait for price calculation
    await waitFor(() => {
      const priceElem = screen.getByTestId('preview-unit-price');
      expect(priceElem).toHaveTextContent('380.00 BDT');
    });

    const addBtn = screen.getByTestId('add-to-cart-button');
    expect(addBtn).not.toBeDisabled();

    fireEvent.click(addBtn);
    expect(handleAddToCart).toHaveBeenCalledWith({
      options: { toast: 1, scrambled: 2, sausage: 1, ketchup: 1 },
      qty: 1,
      unitPriceBDT: 380,
    });
  });

  it('TC-12: Pricing responses return out of order - only latest configuration price is ever displayed', async () => {
    // Intercept /api/price to simulate out-of-order race conditions
    server.use(
      http.post('/api/price', async ({ request }) => {
        const body = (await request.json()) as {
          requestId?: string;
          lines: Array<{ options: Record<string, number> }>;
        };
        const reqId = body.requestId;

        // If request is req-1, simulate long latency (300 ms)
        // If request is req-2, simulate fast response (20 ms)
        if (reqId === '1') {
          await delay(200);
          return HttpResponse.json({
            pricing: {
              finalUnitPriceBDT: 380, // Old price
            },
            requestId: '1',
          });
        }

        if (reqId === '2') {
          await delay(20);
          return HttpResponse.json({
            pricing: {
              finalUnitPriceBDT: 490, // New price
            },
            requestId: '2',
          });
        }

        return HttpResponse.json({
          pricing: { finalUnitPriceBDT: 250 },
          requestId: reqId,
        });
      })
    );

    const { result, rerender } = renderHook(
      ({ config, qty }) => usePricePreview({ config, qty, skipDebounce: true }),
      {
        initialProps: {
          config: { toast: 1, scrambled: 2, sausage: 1 } as Record<string, number>, // Request 1
          qty: 1,
        },
      }
    );

    // Immediately trigger Request 2 before Request 1 finishes
    act(() => {
      rerender({
        config: { paratha: 1, fried: 2, tofu: 1, cheese: 2 } as Record<string, number>, // Request 2
        qty: 1,
      });
    });

    // Wait until loading finishes
    await waitFor(
      () => {
        expect(result.current.isLoading).toBe(false);
        expect(result.current.pricing).not.toBeNull();
      },
      { timeout: 3000 }
    );

    // Request 2 (fast, 490 BDT) returned first, then Request 1 (slow, 380 BDT) resolved later.
    // The hook must discard Request 1 and keep Request 2's price (490 BDT)!
    expect(result.current.pricing?.finalUnitPriceBDT).toBe(490);
  });

  it('supports expand/collapse accordion toggle for item categories like FAQ', () => {
    const handleAddToCart = vi.fn();

    render(
      <OrderBuilder
        menu={mockMenu}
        availableStock={mockMenu.ingredientStock}
        onAddToCart={handleAddToCart}
        skipDebounceForTest={true}
      />
    );

    // Bread options are visible initially
    expect(screen.getByTestId('option-card-toast')).toBeInTheDocument();

    // Toggle collapse Bread
    const breadToggle = screen.getByTestId('accordion-toggle-bread');
    expect(breadToggle).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(breadToggle);

    // Now Bread options are collapsed
    expect(breadToggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByTestId('option-card-toast')).not.toBeInTheDocument();

    // Eggs options remain open
    expect(screen.getByTestId('option-card-scrambled')).toBeInTheDocument();

    // Toggle expand Bread again
    fireEvent.click(breadToggle);
    expect(breadToggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('option-card-toast')).toBeInTheDocument();

    // Test Collapse All / Expand All toggle
    const toggleAllBtn = screen.getByTestId('toggle-all-groups-btn');
    expect(toggleAllBtn).toHaveTextContent('Collapse All');

    // Click Collapse All
    fireEvent.click(toggleAllBtn);
    expect(screen.queryByTestId('option-card-toast')).not.toBeInTheDocument();
    expect(screen.queryByTestId('option-card-scrambled')).not.toBeInTheDocument();
    expect(toggleAllBtn).toHaveTextContent('Expand All');

    // Click Expand All
    fireEvent.click(toggleAllBtn);
    expect(screen.getByTestId('option-card-toast')).toBeInTheDocument();
    expect(screen.getByTestId('option-card-scrambled')).toBeInTheDocument();
  });
});
