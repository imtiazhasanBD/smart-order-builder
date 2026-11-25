import React, { useState, useMemo, useEffect } from 'react';
import { StoredOrder } from '@/types';
import {
  Download,
  History,
  Tag,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { IngredientIcon } from '@/components/IngredientIcon';

export interface OrdersViewProps {
  orders: StoredOrder[];
  onSwitchToBuilder?: () => void;
  defaultPageSize?: number;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onSwitchToBuilder,
  defaultPageSize = 5,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  // Compute pagination bounds
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));

  // Reset to valid page when data size or page size changes
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, orders.length);
  const paginatedOrders = useMemo(
    () => orders.slice(startIndex, endIndex),
    [orders, startIndex, endIndex]
  );

  // Generate page numbers to display with smart ellipsis if many pages
  const pageNumbers = useMemo(() => {
    const pages: (number | '...')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  }, [totalPages, currentPage]);

  const handleDownloadJson = () => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(orders, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'orders.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatDhakaTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Dhaka',
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with Title, Page Status and Download Button */}
      <div className="bg-white border border-slate-200 rounded-md p-5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-500" />
              <span>Completed Orders ({orders.length})</span>
            </h2>
            {totalPages > 1 && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                Page {currentPage} of {totalPages}
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Historical seed orders and live checkouts saved in persistent JSON storage.
          </p>
        </div>

        <button
          onClick={handleDownloadJson}
          data-testid="download-orders-json-button"
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-md flex items-center gap-2 shadow-xs transition"
        >
          <Download className="w-4 h-4 text-amber-400" />
          <span>Download orders.json</span>
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-md p-10 text-center shadow-xs max-w-lg mx-auto">
          <div className="w-14 h-14 bg-slate-100 rounded-md flex items-center justify-center mx-auto mb-4 text-slate-400">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <h3 className="text-xl font-bold text-slate-900">No Orders Placed Yet</h3>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Completed breakfast purchases will appear here with complete breakdowns and JSON export.
          </p>
          {onSwitchToBuilder && (
            <button
              onClick={onSwitchToBuilder}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6 py-2.5 rounded-md text-sm shadow-xs transition"
            >
              Build a Breakfast
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Paginated Orders List */}
          <div className="space-y-3" data-testid="orders-list">
            {paginatedOrders.map((order) => (
              <div
                key={order.id}
                data-testid={`order-card-${order.id}`}
                className="bg-white border border-slate-200 rounded-md p-4 shadow-xs hover:border-slate-300 transition"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-sm">
                      {order.id}
                    </span>
                    <span className="text-xs text-slate-500">
                      {formatDhakaTime(order.createdAt)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-sm bg-slate-100 text-slate-700">
                      {order.paymentMethod}
                    </span>

                    {order.couponCode && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-sm bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {order.couponCode}
                        {order.pricing?.couponStatus?.applied ? ' (Applied)' : ' (Not applied)'}
                      </span>
                    )}

                    <span className="font-bold text-base text-slate-900">
                      {order.pricing?.payableBDT?.toLocaleString() || 0} BDT
                    </span>
                  </div>
                </div>

                {/* Order lines */}
                <div className="py-2.5 space-y-1.5">
                  {order.lines.map((line, lIdx) => (
                    <div key={lIdx} className="text-xs text-slate-600 flex flex-wrap items-center gap-1.5">
                      <span className="font-semibold text-slate-800">Item #{lIdx + 1} (x{line.qty}):</span>
                      {Object.entries(line.options).map(([opt, cnt]) => {
                        if (cnt <= 0) return null;
                        return (
                          <span
                            key={opt}
                            className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded-sm"
                          >
                            <IngredientIcon id={opt} size="xs" className="w-3.5 h-3.5 inline-block" />
                            <span>
                              {opt}: <strong>{cnt}</strong>
                            </span>
                          </span>
                        );
                      })}
                    </div>
                  ))}
                </div>

                {/* Breakdown footer */}
                {order.pricing && (() => {
                  const subtotal =
                    order.pricing.cartSubtotalBDT ??
                    (order.pricing.subtotalBDT ??
                      (order.pricing.subtotalPoisha ? order.pricing.subtotalPoisha / 100 : 0));

                  const discountAmount =
                    order.pricing.appliedDiscount.amountBDT ??
                    order.pricing.appliedDiscount.discountBDT ??
                    (order.pricing.appliedDiscount.amountPoisha ? order.pricing.appliedDiscount.amountPoisha / 100 : 0);

                  const vat =
                    order.pricing.vatBDT ??
                    (order.pricing.vatPoisha ? order.pricing.vatPoisha / 100 : 0);

                  const payable = order.pricing.payableBDT ?? 0;

                  return (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                      <span>Cart Subtotal: {subtotal.toFixed(2)} BDT</span>
                      {order.pricing.appliedDiscount.type !== 'NONE' && (
                        <span className="text-emerald-700">
                          Discount: -{discountAmount.toFixed(2)} BDT ({order.pricing.appliedDiscount.name})
                        </span>
                      )}
                      <span>VAT: {vat.toFixed(2)} BDT</span>
                      <span className="font-bold text-slate-800 text-sm">
                        Payable: {payable.toLocaleString()} BDT
                      </span>
                    </div>
                  );
                })()}
              </div>
            ))}
          </div>

          {/* Pagination Controls Bar */}
          <div
            data-testid="orders-pagination"
            className="bg-white border border-slate-200 rounded-md p-3.5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600"
          >
            {/* Left: Range description and Page Size selector */}
            <div className="flex flex-wrap items-center gap-3">
              <span data-testid="pagination-info">
                Showing <strong className="text-slate-900 font-bold">{startIndex + 1}</strong> to{' '}
                <strong className="text-slate-900 font-bold">{endIndex}</strong> of{' '}
                <strong className="text-slate-900 font-bold">{orders.length}</strong> orders
              </span>

              <div className="flex items-center gap-1.5 pl-3 border-l border-slate-200">
                <label htmlFor="orders-page-size" className="text-slate-500 font-medium">
                  Per page:
                </label>
                <select
                  id="orders-page-size"
                  data-testid="page-size-select"
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-slate-50 border border-slate-200 text-slate-800 rounded px-2 py-1 font-semibold focus:outline-hidden focus:ring-1 focus:ring-amber-500 cursor-pointer text-xs"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Pagination Navigation Buttons */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 select-none">
                <button
                  type="button"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  data-testid="pagination-first"
                  aria-label="First page"
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="First page"
                >
                  <ChevronsLeft className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="pagination-prev"
                  aria-label="Previous page"
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Prev</span>
                </button>

                {pageNumbers.map((page, idx) =>
                  page === '...' ? (
                    <span key={`ellipsis-${idx}`} className="px-2 text-slate-400 select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      aria-label={`Page ${page}`}
                      aria-current={currentPage === page ? 'page' : undefined}
                      data-testid={`pagination-page-${page}`}
                      className={`min-w-[32px] h-8 px-2 rounded text-xs font-bold transition flex items-center justify-center ${
                        currentPage === page
                          ? 'bg-amber-500 text-slate-950 border border-amber-500 shadow-2xs'
                          : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  data-testid="pagination-next"
                  aria-label="Next page"
                  className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  data-testid="pagination-last"
                  aria-label="Last page"
                  className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title="Last page"
                >
                  <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
