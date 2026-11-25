import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchMenu, fetchServerTime } from '@/services/api';
import { OrderBuilder } from '@/features/configurator/OrderBuilder';
import { OrderBuilderSkeleton } from '@/components/OrderBuilderSkeleton';
import { Navbar } from '@/components/Navbar';
import { AlertCircle, ShoppingBag, History, Bot } from 'lucide-react';
import { SelectedOptions } from '@/types';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'builder' | 'cart' | 'assistant' | 'orders'>('builder');
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(90000);
  const [cartCount, setCartCount] = useState<number>(0);

  // Sync server clock on mount
  useEffect(() => {
    fetchServerTime()
      .then((data) => {
        setServerOffsetMs(data.serverOffsetMs);
      })
      .catch(() => {
        // Fallback default 90s offset
      });
  }, []);

  // Fetch menu fixture using TanStack Query
  const { data: menu, isLoading, isError, error } = useQuery({
    queryKey: ['menu'],
    queryFn: fetchMenu,
  });

  const handleAddToCart = (item: {
    options: SelectedOptions;
    qty: number;
    unitPriceBDT: number;
  }) => {
    setCartCount((prev) => prev + item.qty);
    console.log('Item added to cart:', item);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        cartCount={cartCount}
        serverOffsetMs={serverOffsetMs}
      />

      {/* Main Content Pane */}
      <main className="max-w-7xl w-full mx-auto px-4 py-6 flex-1">
        {isLoading ? (
          <OrderBuilderSkeleton />
        ) : isError || !menu ? (
          <div className="min-h-[400px] flex items-center justify-center p-4">
            <div className="bg-white border border-rose-200 rounded-md p-6 max-w-md shadow text-center">
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
                availableStock={menu.ingredientStock}
                onAddToCart={handleAddToCart}
              />
            )}

            {activeTab === 'cart' && (
              <div className="bg-white border border-slate-200 rounded-md p-8 shadow-sm text-center">
                <ShoppingBag className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-slate-800">Your Cart</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Active reservations and cart items will be displayed here in Step 06.
                </p>
                <button
                  onClick={() => setActiveTab('builder')}
                  className="mt-4 px-4 py-2 bg-amber-500 text-slate-950 rounded-md text-sm font-bold hover:bg-amber-400"
                >
                  Back to Builder
                </button>
              </div>
            )}

            {activeTab === 'orders' && (
              <div className="bg-white border border-slate-200 rounded-md p-8 shadow-sm text-center">
                <History className="w-12 h-12 text-amber-500 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-slate-800">Completed Orders</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Historical orders and JSON download will be displayed here in Step 07.
                </p>
              </div>
            )}

            {activeTab === 'assistant' && (
              <div className="bg-white border border-slate-200 rounded-md p-8 shadow-sm text-center">
                <Bot className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
                <h2 className="text-xl font-bold text-slate-800">Sales AI Assistant</h2>
                <p className="text-sm text-slate-500 mt-1">
                  Gemini Flash sales analytics and natural language query agent will be available in Step 09.
                </p>
              </div>
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

export default App;
