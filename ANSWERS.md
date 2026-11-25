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

### Q2. Cheapest Valid Configuration and Unit Price
- **Objective**: Identify the lowest-cost valid configuration satisfying all group limits and cross-group selection rules, including its final unit price in BDT.
- **Status**: Pending verification
- **Calculation**: Pending

---

### Q3. Cart Price Evaluation at 10:30 vs 11:30
- **Objective**: Compute the subtotal, applicable discount, VAT, and final payable for Cart = A x3 evaluated at 10:30 AM vs 11:30 AM Dhaka time.
- **Status**: Pending verification
- **Calculation**: Pending

---

### Q4. Payable After Item Modification (TC-10) at 11:30
- **Objective**: Calculate the final payable amount at 11:30 AM following the cart modification described in TC-10.
- **Status**: Pending verification
- **Calculation**: Pending

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
