import React from 'react';
import { ShoppingBag, Bot, History, ChefHat } from 'lucide-react';

export interface NavbarProps {
  activeTab: 'builder' | 'cart' | 'assistant' | 'orders';
  setActiveTab: (tab: 'builder' | 'cart' | 'assistant' | 'orders') => void;
  cartCount: number;
  serverOffsetMs?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  cartCount,
}) => {
  return (
    <header className="bg-slate-900 text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-4">
          {/* Brand Logo & Title */}
          <div
            className="flex items-center justify-between sm:justify-start cursor-pointer select-none"
            onClick={() => setActiveTab('builder')}
          >
            <div className="flex items-center gap-2.5">
              <div className="bg-amber-500 p-1.5 sm:p-2 rounded-md text-slate-950 font-bold shrink-0 shadow-xs">
                <ChefHat className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white leading-tight">
                  Smart Order Builder
                </h1>
                <p className="text-[11px] sm:text-xs text-slate-400 hidden sm:block">
                  Breakfast Rules & Stock Engine
                </p>
              </div>
            </div>

            {/* Quick Cart Pill on Mobile (visible only on mobile right side of brand) */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setActiveTab('cart');
              }}
              className="sm:hidden flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-800 text-amber-300 border border-slate-700 hover:bg-slate-700 transition"
              aria-label="View Cart"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
              <span>{cartCount}</span>
            </button>
          </div>

          {/* Navigation Tabs - Evenly spaced segmented bar on mobile */}
          <nav className="grid grid-cols-4 sm:flex sm:items-center gap-1 sm:gap-1.5 bg-slate-950/60 sm:bg-transparent p-1 sm:p-0 rounded-lg sm:rounded-none border border-slate-800/80 sm:border-none">
            <button
              type="button"
              onClick={() => setActiveTab('builder')}
              className={`py-1.5 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'builder'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Builder</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('cart')}
              className={`py-1.5 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 relative ${
                activeTab === 'cart'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Cart</span>
              {cartCount > 0 && (
                <span className="bg-rose-500 text-white text-[10px] sm:text-xs px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                  {cartCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`py-1.5 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'orders'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="truncate">Orders</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('assistant')}
              className={`py-1.5 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${
                activeTab === 'assistant'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Bot className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-300 shrink-0" />
              <span className="truncate">Sales AI</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
