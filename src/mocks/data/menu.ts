import { MenuResponse } from '@/types';

export const MENU_FIXTURE: Omit<MenuResponse, 'serverTime'> = {
  productId: 'breakfast-builder',
  productName: 'Build Your Breakfast',
  basePriceBDT: 250,
  basePricePoisha: 25000,
  groups: [
    {
      id: 'bread',
      name: 'Bread',
      limits: { min: 1, max: 1 },
      options: [
        {
          id: 'toast',
          name: 'Toast',
          priceBDT: 0,
          pricePoisha: 0,
          ingredients: { toast: 1 },
        },
        {
          id: 'paratha',
          name: 'Paratha',
          priceBDT: 20,
          pricePoisha: 2000,
          ingredients: { paratha: 1 },
        },
        {
          id: 'croissant',
          name: 'Croissant',
          priceBDT: 60,
          pricePoisha: 6000,
          ingredients: { croissant: 1 },
        },
      ],
    },
    {
      id: 'eggs',
      name: 'Eggs',
      limits: { min: 2, max: 6, step: 2 },
      options: [
        {
          id: 'fried',
          name: 'Fried',
          priceBDT: 30,
          pricePoisha: 3000,
          ingredients: { egg: 1 },
        },
        {
          id: 'scrambled',
          name: 'Scrambled',
          priceBDT: 35,
          pricePoisha: 3500,
          ingredients: { egg: 1 },
        },
        {
          id: 'omelette',
          name: 'Omelette',
          priceBDT: 70,
          pricePoisha: 7000,
          ingredients: { egg: 2 },
        },
      ],
    },
    {
      id: 'protein',
      name: 'Protein',
      limits: { min: 1, max: 3 },
      options: [
        {
          id: 'sausage',
          name: 'Chicken Sausage',
          priceBDT: 60,
          pricePoisha: 6000,
          ingredients: { sausage: 1 },
        },
        {
          id: 'bacon',
          name: 'Beef Bacon',
          priceBDT: 90,
          pricePoisha: 9000,
          ingredients: { bacon: 1 },
        },
        {
          id: 'tofu',
          name: 'Tofu',
          priceBDT: 50,
          pricePoisha: 5000,
          ingredients: { tofu: 1 },
        },
      ],
    },
    {
      id: 'extras',
      name: 'Extras',
      limits: { min: 0, max: 4 },
      options: [
        {
          id: 'hashbrown',
          name: 'Hash Brown',
          priceBDT: 40,
          pricePoisha: 4000,
          ingredients: { hashbrown: 1 },
        },
        {
          id: 'mushroom',
          name: 'Mushroom',
          priceBDT: 30,
          pricePoisha: 3000,
          ingredients: { mushroom: 1 },
        },
        {
          id: 'beans',
          name: 'Baked Beans',
          priceBDT: 25,
          pricePoisha: 2500,
          ingredients: { beans: 1 },
        },
        {
          id: 'cheese',
          name: 'Cheese',
          priceBDT: 35,
          pricePoisha: 3500,
          ingredients: { cheese: 1 },
        },
      ],
    },
    {
      id: 'sauce',
      name: 'Sauce',
      limits: { min: 0, maxDistinct: 2, maxPerOption: 1 },
      options: [
        {
          id: 'ketchup',
          name: 'Ketchup',
          priceBDT: 0,
          pricePoisha: 0,
          ingredients: {}, // Unlimited
        },
        {
          id: 'hollandaise',
          name: 'Hollandaise',
          priceBDT: 25,
          pricePoisha: 2500,
          ingredients: { hollandaise: 1 },
        },
        {
          id: 'chili',
          name: 'Chili',
          priceBDT: 10,
          pricePoisha: 1000,
          ingredients: {}, // Unlimited
        },
      ],
    },
  ],
  rules: [
    {
      id: 'R1',
      type: 'requires',
      optionId: 'hollandaise',
      requiredAnyOf: ['scrambled', 'omelette'],
      message: 'Hollandaise requires Scrambled or Omelette',
    },
    {
      id: 'R2',
      type: 'excludes',
      optionId: 'tofu',
      excludedOptions: ['sausage', 'bacon'],
      message: 'Tofu cannot be combined with Chicken Sausage or Beef Bacon',
    },
    {
      id: 'R3',
      type: 'overrideLimit',
      optionId: 'croissant',
      targetGroupId: 'extras',
      limits: { max: 2 },
      message: 'extras max is 2 when Croissant is selected',
    },
    {
      id: 'R4',
      type: 'excludes',
      optionId: 'chili',
      excludedOptions: ['hollandaise'],
      message: 'Chili cannot be combined with Hollandaise',
    },
  ],
  promotions: {
    unitExtras: {
      id: 'P2',
      name: 'Extras Deal',
      type: 'cheapest_free_per_n',
      targetGroupId: 'extras',
      everyNUnits: 3,
    },
    unitCombo: {
      id: 'P1',
      name: 'Breakfast Combo Discount',
      type: 'combo_discount',
      conditions: [
        { groupId: 'eggs', minUnits: 4 },
        { groupId: 'protein', minUnits: 2 },
      ],
      discountPercent: 10,
    },
    cartThreshold: {
      id: 'C1',
      name: 'Order Threshold Discount',
      type: 'threshold_fixed',
      minSubtotalPoisha: 120000, // 1,200 BDT
      discountPoisha: 10000,    // 100 BDT
    },
    cartCoupon: {
      id: 'C2',
      name: 'Morning Coupon (MORNING15)',
      type: 'coupon_percentage_capped',
      code: 'MORNING15',
      percent: 15,
      maxDiscountPoisha: 15000, // 150 BDT
      cutoffHourDhaka: 11,
      cutoffMinuteDhaka: 0,
    },
  },
  ingredientStock: {
    egg: 10,
    sausage: 4,
    bacon: 3,
    tofu: 5,
    croissant: 2,
    paratha: 10,
    toast: 20,
    hashbrown: 6,
    mushroom: 6,
    beans: 8,
    cheese: 4,
    hollandaise: 5,
  },
};
