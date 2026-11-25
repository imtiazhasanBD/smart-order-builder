# Decision Register (DECISIONS.md)

This register tracks critical architectural, business logic, and trade-off decisions for the Smart Order Builder project. Decisions are evaluated and finalized progressively across project milestones.

---

## Decision Summary

| ID | Decision | Status |
|---|---|---|
| C1 | Money representation and rounding | Decided |
| C2 | Supported chatbot questions and analytics function contract | Decided |
| D1 | Concurrent stock behavior | Decided |
| D2 | Price lock timing | Decided |
| D3 | Reservation expiry during edit | Decided |
| D4 | Order ID/timestamp ownership and duplicate Pay prevention | Decided |
| D5 | Best customer data limitation | Decided |
| D6 | Order JSON schema and coupon recording | Decided |

---

## Register Details

### C1: Money Representation and Rounding

**Decision:** Store all money as integer poisha and use half-up rounding for percentage calculations.

**Reasoning:**

I chose integer poisha instead of JavaScript floats to avoid decimal precision issues. For example, in TC-06, calculating 5% VAT on 1,509.50 BDT using floats can produce `75.47499999999999`. Using poisha, the calculation is 150,950 × 5 / 100 = 7,547.5, which rounds half-up to 7,548 poisha (75.48 BDT).

The final payable amount is rounded to whole BDT, giving 1,585 BDT.

**Trade-off:** I need to convert BDT to poisha when calculating and back to BDT when displaying prices, but this keeps money calculations consistent.

**Status:** Decided

---

### C2: Supported Chatbot Questions and Analytics Functions

**Decision:** The chatbot will support the following questions using TypeScript analytics functions:

| Question | Function | Input |
|---|---|---|
| How many orders? | `getOrderCount` | `orders` |
| What is the total revenue? | `getTotalRevenue` | `orders` |
| What is the best-selling option? | `getBestSellingOption` | `orders, groups` |
| Revenue by payment method? | `getRevenueByPaymentMethod` | `orders` |
| What is the average order value? | `getAverageOrderValue` | `orders` |
| How many orders used MORNING15? | `getCouponUsageStats` | `orders, couponCode` |
| Orders and revenue on a given date? | `getOrdersByDate` | `orders, date` |
| Who is our best customer? | `getUnavailableDataNotice` | `dataType` |

**Reasoning:** Gemini will understand the question, select the appropriate function, and explain its result. All calculations will happen in TypeScript, not in the AI model. This keeps the numbers consistent with the actual order data.

**Trade-off:** Supporting new types of questions may require adding new analytics functions and tools, but each calculation can be tested independently.

**Status:** Decided

---

### D1: Concurrent Stock Behavior

**Decision:** Keep the user's changes if stock becomes unavailable in another tab.

**Reasoning:**

If Tab A is editing an item and Tab B takes the remaining stock, saving from Tab A will return a 409 Conflict. I'll show which ingredients are unavailable and keep the edit modal open with the user's selections unchanged. The user can adjust the options and try again after the stock information is updated.

I chose this approach because clearing the form would force the user to configure the item again. Keeping their selections makes it easier to fix only the affected options.

**Trade-off:** I need to refresh stock information without resetting the form state, which requires some extra state management.

**Status:** Decided

---

### D2: Price Lock Timing

**Decision:** Reserve stock when adding an item to the cart, but calculate promotional discounts at checkout.

**Reasoning:**

I chose this because stock needs to be reserved immediately to prevent overselling, while promotions can expire. MORNING15 is valid only before 11:00 AM. In TC-06, the coupon applies at 10:59:59, but in TC-07, it is rejected at 11:00:00 and C1 is applied instead.

**Trade-off:** The cart total can change if the customer waits until after 11:00 AM to checkout. I'll show the updated price and explain why the coupon is no longer valid.

**Status:** Decided

---

### D3: Reservation Expiry During Edit

**Decision:** If a reservation expires while an item is being edited, the server releases its stock and marks the item as read-only. Saving the edit will fail with a 410 Gone or 409 Conflict response.

**Reasoning:** A reservation should not hold stock beyond its 5-minute limit. If the user tries to save after expiry, I'll keep their selections in the builder and show a message explaining that the reservation has expired. They can add the configuration again as a new item if stock is still available.

**Trade-off:** The user must add the item again instead of updating the expired reservation, but their unsaved selections are not lost.

**Status:** Decided

---

### D4: Order ID/Timestamp Ownership and Duplicate Pay Prevention

**Decision:** The server generates the order ID and `createdAt` timestamp. The client sends an idempotency key with each checkout request to prevent duplicate orders.

**Reasoning:** The browser clock may be incorrect, so the server should control order IDs and timestamps. If the user clicks Pay multiple times, the server checks the idempotency key and returns the existing order instead of creating another one. This ensures stock is deducted only once.

**Trade-off:** The server needs to keep track of previously used idempotency keys so repeated requests don't create duplicate orders.

**Status:** Decided

---

### D5: Best Customer Data Limitation

**Decision:** If someone asks about customer details, such as "Who is our best customer?" or "Where was order X delivered?", the assistant will explain that this information is not available.

**Reasoning:** The order data does not include customer names, IDs, emails, or delivery addresses. The assistant will not guess or make up this information. Instead, the analytics tool will return `supported: false` with a reason.

**Trade-off:** Customer-related questions cannot be answered, but the assistant will only provide information supported by the available data.

**Status:** Decided

---

### D6: Order JSON Schema and Coupon Recording

**Decision:** Store each order with its configuration, pricing breakdown, and coupon status in JSON.

**Selected approach:**

I'll store money in integer poisha as the main value for all calculations. Each order will also contain a snapshot of its selected options and final pricing so that old orders remain unchanged if menu prices change later.

If a customer enters a coupon but it isn't applied, I'll still save the coupon code with `entered: true`, `applied: false`, and a reason explaining why it was rejected.

**Example order structure:**

```json
{
  "id": "ORD-1007",
  "createdAt": "2026-11-25T20:30:00+06:00",
  "paymentMethod": "bkash",
  "lines": [
    {
      "itemId": "item-1",
      "qty": 2,
      "options": {
        "paratha": 1,
        "fried": 2,
        "tofu": 1,
        "cheese": 2,
        "beans": 1,
        "mushroom": 1,
        "chili": 1
      },
      "unitPricePoisha": 49000,
      "lineTotalPoisha": 98000
    }
  ],
  "pricing": {
    "currency": "BDT",
    "cartSubtotalPoisha": 98000,
    "appliedDiscount": {
      "type": "NONE",
      "amountPoisha": 0
    },
    "couponStatus": {
      "code": "MORNING15",
      "entered": true,
      "applied": false,
      "reason": "Coupon expired after 11:00 AM"
    },
    "discountedSubtotalPoisha": 98000,
    "vatPoisha": 4900,
    "payablePoisha": 102900
  }
}
```

**Reasoning:** Keeping the pricing breakdown in the order makes historical totals easy to verify. Saving rejected coupon attempts will also help answer Q8 and prevent the sales assistant from assuming that every entered coupon was applied.

**Trade-off:** The JSON contains more pricing details, but this makes order history and revenue calculations easier to maintain.

**Status:** Decided
