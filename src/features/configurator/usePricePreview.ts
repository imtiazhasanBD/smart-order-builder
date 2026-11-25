import { useState, useEffect, useRef, useCallback } from 'react';
import { SelectedOptions, PricingBreakdown } from '@/types';

export interface UsePricePreviewOptions {
  config: SelectedOptions;
  qty: number;
  skipDebounce?: boolean;
}

export interface UsePricePreviewResult {
  pricing: PricingBreakdown | null;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string | null;
  retry: () => void;
}

/**
 * Hook for asynchronous price preview from the mock server.
 * Implements 300 ms debounce, AbortController cancellation,
 * and sequential request ID tracking to guarantee that an older
 * response never overwrites a newer configuration's price (TC-12).
 */
export function usePricePreview({
  config,
  qty,
  skipDebounce = false,
}: UsePricePreviewOptions): UsePricePreviewResult {
  const [pricing, setPricing] = useState<PricingBreakdown | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const latestRequestIdRef = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchPrice = useCallback(
    async (optionsToPrice: SelectedOptions, quantity: number, reqId: number) => {
      // Abort previous in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsLoading(true);
      setIsError(false);
      setErrorMessage(null);

      try {
        const response = await fetch('/api/price', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            lines: [{ id: 'preview-item', qty: quantity, options: optionsToPrice }],
            requestId: String(reqId),
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Price calculation failed: HTTP ${response.status}`);
        }

        const data = (await response.json()) as {
          pricing: PricingBreakdown;
          requestId?: string;
        };

        // Guard against out-of-order responses (TC-12):
        // Only apply if this response corresponds to the latest request issued
        if (reqId === latestRequestIdRef.current) {
          setPricing(data.pricing);
          setIsLoading(false);
        }
      } catch (err: unknown) {
        // Ignore aborted requests
        if (err instanceof DOMException && err.name === 'AbortError') {
          return;
        }

        if (reqId === latestRequestIdRef.current) {
          setIsError(true);
          setErrorMessage(
            err instanceof Error ? err.message : 'Unable to calculate price'
          );
          setIsLoading(false);
        }
      }
    },
    []
  );

  const triggerFetch = useCallback(() => {
    latestRequestIdRef.current += 1;
    const currentReqId = latestRequestIdRef.current;
    fetchPrice(config, qty, currentReqId);
  }, [config, qty, fetchPrice]);

  useEffect(() => {
    // If config is completely empty, don't spam requests
    const hasSelections = Object.values(config).some((q) => q > 0);
    if (!hasSelections) {
      setPricing(null);
      setIsLoading(false);
      setIsError(false);
      return;
    }

    if (skipDebounce) {
      triggerFetch();
      return;
    }

    // 300 ms debounce
    const timer = setTimeout(() => {
      triggerFetch();
    }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [config, qty, skipDebounce, triggerFetch]);

  return {
    pricing,
    isLoading,
    isError,
    errorMessage,
    retry: triggerFetch,
  };
}
