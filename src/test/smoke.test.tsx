import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from '@/app/App';
import { AppProviders } from '@/app/providers';

describe('Project Foundation Smoke Test', () => {
  it('renders application heading using React Testing Library and jest-dom matchers', () => {
    render(
      <AppProviders>
        <App />
      </AppProviders>
    );

    const heading = screen.getByRole('heading', { name: /smart order builder/i });
    expect(heading).toBeInTheDocument();
  });
});
