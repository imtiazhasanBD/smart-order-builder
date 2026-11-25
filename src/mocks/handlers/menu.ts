import { http, HttpResponse } from 'msw';
import { MENU_FIXTURE } from '../data/menu';
import { serverStore, SERVER_OFFSET_MS } from '../serverStore';
import { MenuResponse } from '@/types';

export const menuHandlers = [
  http.get('/api/menu', () => {
    const response: MenuResponse = {
      ...MENU_FIXTURE,
      ingredientStock: serverStore.getIngredientStock(),
      serverTime: serverStore.getServerTimeISO(),
    };
    return HttpResponse.json(response);
  }),

  http.get('/api/time', () => {
    return HttpResponse.json({
      serverTime: serverStore.getServerTime(),
      serverOffsetMs: SERVER_OFFSET_MS,
    });
  }),
];
