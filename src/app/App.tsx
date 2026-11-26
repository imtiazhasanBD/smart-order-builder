import React, { useState, useCallback } from 'react';
import { useMenu } from '@/hooks/useMenu';
import { useServerTime } from '@/hooks/useServerTime';
import { useCart } from '@/hooks/useCart';
import { useCartMutations } from '@/hooks/useCartMutations';
import { useOrders } from '@/hooks/useOrders';
import { OrderBuilder } from '@/features/configurator/OrderBuilder';
import { OrderBuilderSkeleton } from '@/components/OrderBuilderSkeleton';
import { Cart } from '@/features/cart/Cart';
import { OrdersView } from '@/features/orders/OrdersView';
import { AssistantChat } from '@/features/assistant/AssistantChat';
import { Navbar } from '@/components/Navbar';
import { AlertCircle } from 'lucide-react';
import { SelectedOptions, PaymentMethod } from '@/types';
import { CartReservationItem } from '@/mocks/serverStore';

export const App: React.FC = () => {
  // Navigation & Coordinator state
  const [activeTab, setActiveTab] = useState<'builder' | 'cart' | 'assistant' | 'orders'>('builder');
  const [editingItem, setEditingItem] = useState<{
    id: string;
    options: SelectedOptions;
    qty: number;
  } | null>(null);

  // Queries & Synchronizations managed via dedicated custom hooks
  const { menu, isLoading, isError, error } = useMenu();
  const { serverOffsetMs } = useServerTime();
  const { cartItems, cartVersion, cartCount, remainingStock } = useCart(menu?.ingredientStock);
  const { orders } = useOrders();

  // Cart operations orchestrated via TanStack Query mutations
  const { addMutation, editMutation, removeMutation, checkoutMutation } = useCartMutations(cartVersion);

  // Add / Edit submission from OrderBuilder
  const handleAddToCart = async (item: {
    options: SelectedOptions;
    qty: number;
    unitPriceBDT?: number;
  }) => {
    if (editingItem) {
      await editMutation.mutateAsync({
        id: editingItem.id,
        options: item.options,
        qty: item.qty,
      });
      setEditingItem(null);
    } else {
      await addMutation.mutateAsync({
        options: item.options,
        qty: item.qty,
      });
    }
    setActiveTab('cart');
  };

  // Launch edit mode from Cart
  const handleEditItemLaunch = (item: CartReservationItem) => {
    setEditingItem({
      id: item.id,
      options: { ...item.options },
      qty: item.qty,
    });
    setActiveTab('builder');
  };

  // Cancel edit mode
  const handleCancelEdit = () => {
    setEditingItem(null);
    setActiveTab('cart');
  };

  // Remove cart item
  const handleRemoveItem = useCallback(
    async (itemId: string) => {
      await removeMutation.mutateAsync(itemId);
    },
    [removeMutation]
  );

  // Checkout order
  const handleCheckout = useCallback(
    async (
      paymentMethod: PaymentMethod,
      couponCode: string | null,
      idempotencyKey: string
    ) => {
      await checkoutMutation.mutateAsync({
        paymentMethod,
        couponCode,
        idempotencyKey,
      });
      setActiveTab('orders');
    },
    [checkoutMutation]
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (editingItem && tab !== 'builder') {
            setEditingItem(null);
          }
          setActiveTab(tab);
        }}
        cartCount={cartCount}
        serverOffsetMs={serverOffsetMs}
      />

      {/* Main Content Pane */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1">
        {isLoading ? (
          <OrderBuilderSkeleton />
        ) : isError || !menu ? (
          <div className="min-h-[400px] flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-md p-6 max-w-md shadow-sm text-center">
              <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-800">Failed to Initialize Application</h2>
              <p className="text-sm text-slate-500 mt-2 mb-4">
                {error instanceof Error ? error.message : 'Unknown network error'}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="bg-slate-900 text-white px-4 py-2 rounded-md text-sm font-semibold hover:bg-slate-800"
              >
                Retry Loading
              </button>
            </div>
          </div>
        ) : (
          <>
            {activeTab === 'builder' && (
              <OrderBuilder
                menu={menu}
                availableStock={remainingStock}
                onAddToCart={handleAddToCart}
                editingItem={editingItem}
                onCancelEdit={handleCancelEdit}
              />
            )}

            {activeTab === 'cart' && (
              <Cart
                menu={menu}
                cartItems={cartItems}
                cartVersion={cartVersion}
                serverOffsetMs={serverOffsetMs}
                onEditItem={handleEditItemLaunch}
                onRemoveItem={handleRemoveItem}
                onCheckout={handleCheckout}
                onSwitchToBuilder={() => setActiveTab('builder')}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersView
                orders={orders}
                onSwitchToBuilder={() => setActiveTab('builder')}
              />
            )}

            {activeTab === 'assistant' && (
              <AssistantChat orders={orders} groups={menu.groups} />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-400">
        <p>Smart Order Builder &copy; 2026. Data-driven rules, stock reservations & Gemini sales assistant.</p>
      </footer>
    </div>
  );
};
