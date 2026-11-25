# Decision Register (DECISIONS.md)

This register tracks critical architectural, business logic, and trade-off decisions for the Smart Order Builder project. Decisions are evaluated and finalized progressively across project milestones.

---

## Decision Summary

| ID | Decision | Status |
|---|---|---|
| C1 | Money representation and rounding | Pending |
| C2 | Supported chatbot questions and analytics function contract | Pending |
| D1 | Concurrent stock behavior | Pending |
| D2 | Price lock timing | Pending |
| D3 | Reservation expiry during edit | Pending |
| D4 | Order ID/timestamp ownership and duplicate Pay prevention | Pending |
| D5 | Best customer data limitation | Pending |
| D6 | Order JSON schema and coupon recording | Decided |

---

## Register Details

### C1: Money Representation and Rounding
- **Decision**: Determine numerical format for currency storage and rounding methodology across pricing calculations.
- **Selected approach**: Pending
- **Reasoning**: Pending
- **Trade-offs**: Pending
- **Status**: Pending

---

### C2: Supported Chatbot Questions and Analytics Function Contract
- **Decision**: Define the exact list of query types and deterministic function interfaces powering the sales assistant.
- **Selected approach**: Pending
- **Reasoning**: Pending
- **Trade-offs**: Pending
- **Status**: Pending

---

### D1: Concurrent Stock Behavior
- **Decision**: Define application and UI behavior when available stock is depleted by a concurrent session during active edit.
- **Selected approach**: Pending
- **Reasoning**: Pending
- **Trade-offs**: Pending
- **Status**: Pending

---

### D2: Price Lock Timing
- **Decision**: Establish when promotional pricing rules and discounts are locked during the order lifecycle.
- **Selected approach**: Pending
- **Reasoning**: Pending
- **Trade-offs**: Pending
- **Status**: Pending

---

### D3: Reservation Expiry During Edit
- **Decision**: Determine state handling and user feedback when a temporary reservation expires while modifying an item.
- **Selected approach**: Pending
- **Reasoning**: Pending
- **Trade-offs**: Pending
- **Status**: Pending

---

### D4: Order ID/Timestamp Ownership and Duplicate Pay Prevention
- **Decision**: Determine whether client or server generates canonical order identifiers and timestamps, and how idempotent checkout is enforced.
- **Selected approach**: Pending
- **Reasoning**: Pending
- **Trade-offs**: Pending
- **Status**: Pending

---

### D5: Best Customer Data Limitation
- **Decision**: Determine system response and hallucination guardrails when queried for customer identity data not tracked by the schema.
- **Selected approach**: Pending
- **Reasoning**: Pending
- **Trade-offs**: Pending
- **Status**: Pending

---

### D6: Order JSON Schema and Coupon Recording
- **Decision**: Define the persistent JSON structure for orders, pricing snapshots, and unapplied coupon attempts.
- **Selected approach**:
  For stored orders, I decided to snapshot the full configuration alongside all pricing stages directly inside the record so historical receipts never drift if menu pricing changes later. All financial values are kept strictly in integer poisha (1 BDT = 100 poisha) as the single source of truth to dodge floating-point bugs, with read-only BDT values attached so the UI and exports don't have to repeatedly divide by 100. When a customer enters a coupon code like `MORNING15` that doesn't qualify—such as checking out after 11:00 AM—I still persist the code and keep a `couponStatus` object recording `{ code, entered: true, applied: false, reason: "Order placed after 11:00 AM cutoff" }`. This gives the sales assistant and audit logs clear proof of customer intent while explaining exactly why zero discount was deducted.

  ```json
  {
    "id": "ORD-1007",
    "createdAt": "2026-11-25T20:30:00+06:00",
    "paymentMethod": "bkash",
    "couponCode": "MORNING15",
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
        "unitPriceBDT": 490,
        "lineTotalPoisha": 98000,
        "lineTotalBDT": 980
      }
    ],
    "pricing": {
      "currency": "BDT",
      "unitSubtotalPoisha": 49000,
      "unitSubtotalBDT": 490,
      "step2ExtrasDiscountPoisha": 0,
      "step3ComboDiscountPoisha": 0,
      "finalUnitPricePoisha": 49000,
      "finalUnitPriceBDT": 490,
      "cartSubtotalPoisha": 98000,
      "cartSubtotalBDT": 980,
      "appliedDiscount": {
        "type": "NONE",
        "name": "No discount applied",
        "amountPoisha": 0,
        "amountBDT": 0
      },
      "couponStatus": {
        "code": "MORNING15",
        "entered": true,
        "applied": false,
        "reason": "Coupon MORNING15 is valid only strictly before 11:00 AM Dhaka time"
      },
      "discountedSubtotalPoisha": 98000,
      "discountedSubtotalBDT": 980,
      "vatPoisha": 4900,
      "vatBDT": 49,
      "payablePoisha": 102900,
      "payableBDT": 1029
    }
  }
  ```
- **Reasoning**: Storing integer poisha avoids cumulative rounding bugs in financial ledgers. Recording rejected coupons with a clear reason makes the seed order analysis (Q8) and staff assistant queries deterministic instead of guessing why a coupon had 0 BDT discount.
- **Trade-offs**: Including formatted BDT fields alongside poisha adds a few extra bytes per order, but it saves the frontend and export handlers from having to repeatedly do `/ 100` formatting.
- **Status**: Decided
