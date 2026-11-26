import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { Group, StoredOrder } from '@/types';
import {
  getAverageOrderValue,
  getBestSellingOption,
  getCouponUsageStats,
  getOrderCount,
  getOrdersByDate,
  getRevenueByPaymentMethod,
  getTotalRevenue,
  getUnavailableDataNotice,
} from '@/engines/analytics';

export const toolDeclarations: FunctionDeclaration[] = [
  {
    name: 'getOrderCount',
    description: 'Returns the total count of completed orders.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getTotalRevenue',
    description: 'Returns the total revenue in BDT across all completed orders.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getBestSellingOption',
    description: 'Returns the single best-selling menu option based on total units sold (line qty x option qty).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getRevenueByPaymentMethod',
    description: 'Returns the revenue and order count breakdown by payment method (card, bkash, cash).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getAverageOrderValue',
    description: 'Returns the average order value (AOV) across all orders in BDT.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
  {
    name: 'getCouponUsageStats',
    description: 'Returns coupon performance statistics for MORNING15, showing entered count vs actually applied count.',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        couponCode: {
          type: SchemaType.STRING,
          description: 'Coupon code to analyze, default MORNING15',
        },
      },
    },
  },
  {
    name: 'getOrdersByDate',
    description: 'Returns order count and revenue for a specific date in YYYY-MM-DD format (Asia/Dhaka timezone).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        date: {
          type: SchemaType.STRING,
          description: 'Date string in YYYY-MM-DD format, e.g. 2026-11-20',
        },
      },
      required: ['date'],
    },
  },
  {
    name: 'getUnavailableDataNotice',
    description: 'Call this tool when asked for information not present in the order data (e.g. customer names, user identities, customer profiles, best customer, delivery addresses).',
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        missingEntity: {
          type: SchemaType.STRING,
          description: 'The entity or field that is missing (e.g. "customer")',
        },
      },
      required: ['missingEntity'],
    },
  },
];

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  toolCall?: {
    name: string;
    args: any;
    result: any;
  };
  isError?: boolean;
}

/**
 * Dispatches a tool function call against the current live orders dataset.
 */
export function executeToolCall(
  name: string,
  args: any,
  orders: StoredOrder[],
  groups: Group[]
): any {
  switch (name) {
    case 'getOrderCount':
      return getOrderCount(orders);
    case 'getTotalRevenue':
      return getTotalRevenue(orders);
    case 'getBestSellingOption':
      return getBestSellingOption(orders, groups);
    case 'getRevenueByPaymentMethod':
      return getRevenueByPaymentMethod(orders);
    case 'getAverageOrderValue':
      return getAverageOrderValue(orders);
    case 'getCouponUsageStats':
      return getCouponUsageStats(orders, args?.couponCode || 'MORNING15');
    case 'getOrdersByDate':
      return getOrdersByDate(orders, args?.date || '');
    case 'getUnavailableDataNotice':
      return getUnavailableDataNotice(args?.missingEntity || 'customer');
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/**
 * Formats a clean deterministic fallback message for tool outputs.
 */
export function formatFallbackText(
  name: string,
  args: any,
  result: any,
  isBengali = false
): string {
  if (isBengali) {
    switch (name) {
      case 'getOrderCount':
        return `বর্তমানে আমাদের মোট ${result.totalOrders}টি সম্পন্ন অর্ডার রয়েছে।`;
      case 'getTotalRevenue':
        return `আমাদের মোট বিক্রির পরিমাণ হলো ${result.totalRevenueBDT.toLocaleString()} টাকা (BDT)।`;
      case 'getBestSellingOption':
        return `সবচেয়ে বেশি বিক্রি হওয়া বিকল্পটি হলো "${result.optionName}", মোট ${result.totalUnitsSold}টি ইউনিট বিক্রি হয়েছে।`;
      case 'getRevenueByPaymentMethod': {
        const breakdown = Object.entries(result)
          .map(([m, data]: [string, any]) => `${m.toUpperCase()}: ${data.revenueBDT} টাকা (${data.orderCount} অর্ডার)`)
          .join(', ');
        return `পেমেন্ট পদ্ধতি অনুযায়ী বিক্রির হিসাব: ${breakdown}।`;
      }
      case 'getAverageOrderValue':
        return `গড় অর্ডারের মূল্য (AOV) হলো ${result.aovBDT} টাকা (মোট ${result.totalOrders}টি অর্ডারে)।`;
      case 'getCouponUsageStats':
        return `${args?.couponCode || 'MORNING15'} কুপনটি ${result.enteredCount}টি অর্ডারে দেওয়া হয়েছিল এবং এর মধ্যে ${result.appliedCount}টিতে ছাড় প্রযোজ্য হয়েছে (মোট ছাড়: ${result.totalDiscountBDT} টাকা)।`;
      case 'getOrdersByDate':
        return `${result.date} তারিখে মোট ${result.orderCount}টি অর্ডারে ${result.totalRevenueBDT} টাকা আয় হয়েছে।`;
      case 'getUnavailableDataNotice':
        return `গ্রাহকের ব্যক্তিগত তথ্য (নাম, ঠিকানা ইত্যাদি) আমাদের সেলস ডাটাসেটে সংরক্ষণ করা হয় না, তাই এটি দেওয়া সম্ভব নয়।`;
      default:
        return `ফলাফল: ${JSON.stringify(result)}`;
    }
  }

  switch (name) {
    case 'getOrderCount':
      return `We currently have ${result.totalOrders} completed order(s).`;
    case 'getTotalRevenue':
      return `Total revenue across all completed orders is ${result.totalRevenueBDT.toLocaleString()} BDT.`;
    case 'getBestSellingOption':
      return `The best-selling option is "${result.optionName}" with a total of ${result.totalUnitsSold} unit(s) sold.`;
    case 'getRevenueByPaymentMethod': {
      const breakdown = Object.entries(result)
        .map(([m, data]: [string, any]) => `${m.toUpperCase()}: ${data.revenueBDT} BDT (${data.orderCount} orders)`)
        .join(', ');
      return `Revenue breakdown by payment method: ${breakdown}.`;
    }
    case 'getAverageOrderValue':
      return `The average order value (AOV) is ${result.aovBDT} BDT across ${result.totalOrders} order(s).`;
    case 'getCouponUsageStats':
      return `${result.appliedCount} of ${result.enteredCount} order(s) with coupon ${args?.couponCode || 'MORNING15'} actually received the discount (totaling ${result.totalDiscountBDT} BDT in savings).`;
    case 'getOrdersByDate':
      return `On ${result.date}, there were ${result.orderCount} order(s) generating ${result.totalRevenueBDT} BDT in revenue.`;
    case 'getUnavailableDataNotice':
      return `I cannot determine customer personal identity because customer names and personal information are not collected or stored in this sales dataset.`;
    default:
      return JSON.stringify(result);
  }
}

/**
 * Deterministic local query handler for offline mode, testing, and instant matching.
 */
export function executeDeterministicQuery(
  userQuery: string,
  orders: StoredOrder[],
  groups: Group[]
): { toolName: string; args: any; result: any; responseText: string } | null {
  const query = userQuery.toLowerCase().trim();
  const isBengali = /[\u0980-\u09FF]/.test(userQuery);

  // 1. Customer query (D5 / TC-20)
  if (
    query.includes('customer') ||
    query.includes('who bought') ||
    query.includes('client') ||
    query.includes('কে কিনেছে') ||
    query.includes('গ্রাহক') ||
    query.includes('কাস্টমার')
  ) {
    const result = getUnavailableDataNotice('customer personal identity');
    return {
      toolName: 'getUnavailableDataNotice',
      args: { missingEntity: 'customer' },
      result,
      responseText: formatFallbackText('getUnavailableDataNotice', { missingEntity: 'customer' }, result, isBengali),
    };
  }

  // 2. Order count (TC-18)
  if (
    query.includes('how many order') ||
    query.includes('order count') ||
    query.includes('total order') ||
    query === 'orders' ||
    query.includes('কয়টি অর্ডার') ||
    query.includes('কটি অর্ডার') ||
    query.includes('মোট অর্ডার')
  ) {
    const result = getOrderCount(orders);
    return {
      toolName: 'getOrderCount',
      args: {},
      result,
      responseText: formatFallbackText('getOrderCount', {}, result, isBengali),
    };
  }

  // 3. Best selling option (TC-19)
  if (
    query.includes('best selling') ||
    query.includes('best-selling') ||
    query.includes('popular option') ||
    query.includes('top selling') ||
    query.includes('most sold') ||
    query.includes('most popular') ||
    query.includes('বেশি বিক্রি') ||
    query.includes('বিক্রি হওয়া') ||
    query.includes('জনপ্রিয়')
  ) {
    const result = getBestSellingOption(orders, groups);
    return {
      toolName: 'getBestSellingOption',
      args: {},
      result,
      responseText: formatFallbackText('getBestSellingOption', {}, result, isBengali),
    };
  }

  // 4. Total revenue
  if (
    query.includes('total revenue') ||
    query.includes('how much money') ||
    query.includes('total sales') ||
    query.includes('মোট আয়') ||
    query.includes('মোট বিক্রি') ||
    query.includes('রেভিনিউ')
  ) {
    const result = getTotalRevenue(orders);
    return {
      toolName: 'getTotalRevenue',
      args: {},
      result,
      responseText: formatFallbackText('getTotalRevenue', {}, result, isBengali),
    };
  }

  // 5. Average order value (AOV)
  if (
    query.includes('average order') ||
    query.includes('aov') ||
    query.includes('average value') ||
    query.includes('গড় অর্ডার') ||
    query.includes('গড় অর্ডার')
  ) {
    const result = getAverageOrderValue(orders);
    return {
      toolName: 'getAverageOrderValue',
      args: {},
      result,
      responseText: formatFallbackText('getAverageOrderValue', {}, result, isBengali),
    };
  }

  // 6. Revenue by payment method
  if (
    query.includes('payment method') ||
    query.includes('bkash') ||
    query.includes('card') ||
    query.includes('cash') ||
    query.includes('পেমেন্ট') ||
    query.includes('বিকাশ') ||
    query.includes('কার্ড') ||
    query.includes('ক্যাশ')
  ) {
    const result = getRevenueByPaymentMethod(orders);
    return {
      toolName: 'getRevenueByPaymentMethod',
      args: {},
      result,
      responseText: formatFallbackText('getRevenueByPaymentMethod', {}, result, isBengali),
    };
  }

  // 7. Coupon stats
  if (
    query.includes('coupon') ||
    query.includes('morning15') ||
    query.includes('discount code') ||
    query.includes('কুপন') ||
    query.includes('ডিসকাউন্ট')
  ) {
    const result = getCouponUsageStats(orders, 'MORNING15');
    return {
      toolName: 'getCouponUsageStats',
      args: { couponCode: 'MORNING15' },
      result,
      responseText: formatFallbackText('getCouponUsageStats', { couponCode: 'MORNING15' }, result, isBengali),
    };
  }

  // 8. Orders by date (e.g. 2026-11-20)
  const dateMatch = query.match(/\b\d{4}-\d{2}-\d{2}\b/);
  if (dateMatch) {
    const targetDate = dateMatch[0];
    const result = getOrdersByDate(orders, targetDate);
    return {
      toolName: 'getOrdersByDate',
      args: { date: targetDate },
      result,
      responseText: formatFallbackText('getOrdersByDate', { date: targetDate }, result, isBengali),
    };
  }

  return null;
}

/**
 * Sends a user message to Gemini using function calling over the live orders.
 */
export async function askSalesAssistant(
  apiKey: string | undefined,
  userMessage: string,
  orders: StoredOrder[],
  groups: Group[]
): Promise<ChatMessage> {
  const trimmed = userMessage.trim();
  const isBengali = /[\u0980-\u09FF]/.test(trimmed);

  // If no API key provided, fall back to deterministic tool execution
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    const local = executeDeterministicQuery(trimmed, orders, groups);
    if (local) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: local.responseText,
        toolCall: {
          name: local.toolName,
          args: local.args,
          result: local.result,
        },
      };
    }
    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: 'Gemini API key is not configured. Please set VITE_GEMINI_API_KEY in .env.local to enable full conversational intelligence.',
      isError: true,
    };
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-flash-lite-latest',
      systemInstruction: `You are a helpful sales assistant for Smart Order Builder breakfast shop.
You can understand and respond in both English and Bengali (বাংলা), matching the language used by the user.
All analytical sales numbers MUST be retrieved by calling one of the provided tools (e.g. getOrderCount, getTotalRevenue, getBestSellingOption, getRevenueByPaymentMethod, getAverageOrderValue, getCouponUsageStats, getOrdersByDate).
Customer personal identity is NEVER collected or stored in orders. If asked about customer names, top customer, or user identities, you MUST call getUnavailableDataNotice with missingEntity="customer" and state that customer identity is not recorded in the sales dataset.
Never invent or hallucinate numbers or customer names. Keep answers concise, factual, and friendly.`,
      tools: [{ functionDeclarations: toolDeclarations }],
    });

    const result = await model.generateContent(trimmed);
    const functionCalls = result.response.functionCalls();

    if (functionCalls && functionCalls.length > 0) {
      const call = functionCalls[0];
      const toolResult = executeToolCall(call.name, call.args, orders, groups);

      // Synthesize natural language response using the deterministic figures
      let synthesizedText = '';
      try {
        const synthModel = genAI.getGenerativeModel({ model: 'gemini-flash-lite-latest' });
        const synthPrompt = `You are a helpful sales assistant for Smart Order Builder breakfast shop.
The user asked: "${trimmed}"
The analytical tool "${call.name}" with args ${JSON.stringify(call.args)} returned:
${JSON.stringify(toolResult)}

Please provide a concise, friendly, and natural conversational response in ${isBengali ? 'Bengali (বাংলা)' : 'English'} accurately conveying these exact numbers without altering or hallucinating details.`;

        const synthRes = await synthModel.generateContent(synthPrompt);
        synthesizedText = synthRes.response.text();
      } catch (synthErr) {
        // Fallback to pure deterministic formatting if synthesis encounters network or parsing error
        synthesizedText = formatFallbackText(call.name, call.args, toolResult, isBengali);
      }

      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: synthesizedText,
        toolCall: {
          name: call.name,
          args: call.args,
          result: toolResult,
        },
      };
    }

    // Direct response without function call
    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: result.response.text(),
    };
  } catch (err: any) {
    const status = err?.status || err?.statusCode;
    const errMsg = err?.message || '';

    // First try deterministic local fallback so user gets an answer even if Gemini API hiccups
    const localFallback = executeDeterministicQuery(trimmed, orders, groups);
    if (localFallback) {
      return {
        id: `msg-${Date.now()}`,
        sender: 'assistant',
        text: localFallback.responseText,
        toolCall: {
          name: localFallback.toolName,
          args: localFallback.args,
          result: localFallback.result,
        },
      };
    }

    let message = 'An error occurred while contacting the Gemini assistant.';

    if (status === 429 || errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED')) {
      message = 'Gemini API rate limit or quota exceeded (429). Please wait a moment or try again later.';
    } else if (
      status === 403 ||
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('API key not valid')
    ) {
      message = 'Invalid Gemini API key. Please check VITE_GEMINI_API_KEY in .env.local.';
    } else if (errMsg.includes('fetch failed') || errMsg.includes('network') || errMsg.includes('Failed to fetch')) {
      message = 'Network error communicating with Gemini API. Check your internet connection.';
    } else if (errMsg) {
      message = `Gemini API error: ${errMsg}`;
    }

    return {
      id: `msg-${Date.now()}`,
      sender: 'assistant',
      text: message,
      isError: true,
    };
  }
}
