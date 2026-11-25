# Assessment Calculations & Verification (ANSWERS.md)

This document records the solutions and calculation proofs for technical assessment questions Q1 through Q8. Each answer is verified through automated tests once the underlying engines are implemented.

---
## Q1. Maximum Units of Item C from an Empty Cart

**Answer:** 2 units. Cheese is the limiting ingredient.

**Verification:** `npm test src/test/stockEngine.test.ts`

**Calculation:**

Item C uses the following ingredients per unit:

| Ingredient | Required per Item | Available Stock | Maximum Units |
|---|---:|---:|---:|
| Cheese | 2 | 4 | 2 |
| Egg | 2 | 10 | 5 |
| Tofu | 1 | 5 | 5 |
| Paratha | 1 | 10 | 10 |
| Baked Beans | 1 | 8 | 8 |
| Mushroom | 1 | 6 | 6 |
| Chili | 0 | — | No stock limit |

Cheese allows only 2 units because each Item C requires 2 cheese, while the initial stock is 4.

Adding a third Item C would require 6 cheese in total, exceeding the available stock by 2.

Therefore, the maximum is **2 units**, limited by Cheese.



---

## Q2. Cheapest Valid Configuration and Unit Price

**Answer: 360.00 BDT**

**Verification:** `npm test src/test/pricingEngine.test.ts`

**Configuration:** Toast x1, Fried x2, Tofu x1. No extras or sauce.

**Calculation:**

- Base price: 250 BDT
- Toast: 0 BDT
- Fried eggs: 2 × 30 = 60 BDT
- Tofu: 50 BDT

Total = 250 + 60 + 50 = **360.00 BDT** (36,000 poisha).

This configuration meets the minimum requirements for bread, eggs and protein. Fried x2 also satisfies the egg step of 2. Tofu is valid because neither Chicken Sausage nor Beef Bacon is selected. No extra or sauce is required.

---

## Q3. Cart A x3 at 10:30 and 11:30

**Verification:** `npm test src/test/pricingEngine.test.ts`

First, calculate the price of one Item A:

- Base price: 250 BDT
- Scrambled eggs x2: 70 BDT
- Chicken Sausage x1: 60 BDT
- Toast and Ketchup: 0 BDT

Unit price = 250 + 70 + 60 = **380 BDT**.

For 3 items, the subtotal is 380 x 3 = **1,140 BDT**.

**At 10:30 (MORNING15 entered):**

The subtotal is below 1,200 BDT, so C1 does not apply. MORNING15 is still valid at this time. Its 15% discount would be 171 BDT, but the maximum discount is 150 BDT.

- Discount: 150 BDT
- After discount: 1,140 - 150 = 990 BDT
- VAT: 990 x 5% = 49.50 BDT
- Total: 990 + 49.50 = 1,039.50 BDT

**Payable: 1,040 BDT** after rounding to the nearest whole BDT.

**At 11:30 (MORNING15 entered):**

The coupon is no longer valid because the time is past 11:00 AM. C1 also does not apply because the subtotal is below 1,200 BDT.

- Discount: 0 BDT
- After discount: 1,140 BDT
- VAT: 1,140 x 5% = 57 BDT
- Total: 1,140 + 57 = **1,197 BDT**

**Payable: 1,197 BDT**.

---

## Q4. Payable after TC-10 at 11:30

**Answer: 1,600 BDT**

**Verification:** `npm test src/test/pricingEngine.test.ts`

In TC-10, Item B is changed to Omelette x1 and Fried x3. Its new unit price is 643.50 BDT after the 10% combo discount.

Item C remains unchanged at 490 BDT each.

**Cart calculation:**

- Item B: 643.50 BDT
- Item C: 490 x 2 = 980 BDT
- Subtotal: 1,623.50 BDT

At 11:30, MORNING15 has expired, so C1 applies a 100 BDT discount.

- Discounted subtotal: 1,623.50 - 100 = 1,523.50 BDT
- VAT (5%): 76.175, rounded to 76.18 BDT
- Payable: 1,523.50 + 76.18 = 1,599.68 BDT

After rounding to the nearest whole BDT, the final payable is **1,600 BDT**.

---

### Q5. Historical Seed Orders Pricing and Total Revenue
- **Objective**: Calculate the exact payable for each of the six seed orders at their respective creation timestamps, along with cumulative revenue.
- **Status**: Pending verification
- **Calculation**: Pending

---

### Q6. Best-Selling Option Across Seed Orders
- **Objective**: Identify the most frequently ordered option across all seed orders by multiplying line quantities with option counts.
- **Status**: Pending verification
- **Calculation**: Pending

---

### Q7. Revenue Breakdown by Payment Method
- **Objective**: Determine which payment method generated the highest total revenue across the seed orders dataset.
- **Status**: Pending verification
- **Calculation**: Pending

---

### Q8. Coupon Redemption Analysis Across Seed Orders
- **Objective**: Count how many seed orders received the morning coupon discount, providing root-cause explanations for any order where the code was entered but unapplied.
- **Status**: Pending verification
- **Calculation**: Pending
