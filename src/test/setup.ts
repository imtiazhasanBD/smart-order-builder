import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, beforeAll, afterAll } from 'vitest';
import { server } from '@/mocks/server';

beforeAll(() => {
  server.listen({
    onUnhandledRequest(request, print) {
      if (request.url.includes('generativelanguage.googleapis.com')) {
        return;
      }
      print.warning();
    },
  });
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
