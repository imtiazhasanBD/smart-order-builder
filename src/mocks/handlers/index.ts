import { menuHandlers } from './menu';
import { pricingHandlers } from './pricing';
import { cartHandlers } from './cart';

export const handlers = [
  ...menuHandlers,
  ...pricingHandlers,
  ...cartHandlers,
];
