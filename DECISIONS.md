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
| D6 | Order JSON schema and coupon recording | Pending |

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
- **Selected approach**: Pending
- **Reasoning**: Pending
- **Trade-offs**: Pending
- **Status**: Pending
