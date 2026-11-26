import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { serverStore } from '@/mocks/serverStore';
import { MENU_FIXTURE } from '@/mocks/data/menu';
import { askSalesAssistant } from '@/assistant/gemini';
import { AssistantChat } from '@/features/assistant/AssistantChat';

describe('Step 09: Sales Assistant AI & Function Calling (TC-18, TC-19, TC-20)', () => {
  beforeEach(() => {
    serverStore.reset();
  });

  it('TC-18: Ask bot "How many orders?" after loading seed, then again after one checkout - differs by exactly one', async () => {
    const ordersBefore = serverStore.getOrders();
    expect(ordersBefore.length).toBe(6);

    const replyBefore = await askSalesAssistant(
      undefined,
      'How many orders?',
      ordersBefore,
      MENU_FIXTURE.groups
    );

    expect(replyBefore.text).toContain('6');
    expect(replyBefore.toolCall?.name).toBe('getOrderCount');
    expect(replyBefore.toolCall?.result.totalOrders).toBe(6);

    // Place one checkout
    serverStore.reserveItem('seed-diff-item', { toast: 1, scrambled: 2, sausage: 1 }, 1);
    serverStore.checkout('chk-18', 'card', null);

    const ordersAfter = serverStore.getOrders();
    expect(ordersAfter.length).toBe(7);

    const replyAfter = await askSalesAssistant(
      undefined,
      'How many orders?',
      ordersAfter,
      MENU_FIXTURE.groups
    );

    expect(replyAfter.text).toContain('7');
    expect(replyAfter.toolCall?.result.totalOrders).toBe(7);

    // Differs by exactly 1
    expect(replyAfter.toolCall?.result.totalOrders - replyBefore.toolCall?.result.totalOrders).toBe(1);
  });

  it('TC-19: Ask bot "What is our best-selling item?" - calls getBestSellingOption and names the correct option and count', async () => {
    const orders = serverStore.getOrders();

    const reply = await askSalesAssistant(
      undefined,
      'What is our best-selling item?',
      orders,
      MENU_FIXTURE.groups
    );

    expect(reply.toolCall?.name).toBe('getBestSellingOption');
    expect(reply.toolCall?.result.optionId).toBe('fried');
    expect(reply.toolCall?.result.optionName).toBe('Fried');
    expect(reply.toolCall?.result.totalUnitsSold).toBe(10);
    expect(reply.text).toContain('Fried');
    expect(reply.text).toContain('10');
  });

  it('TC-20: Ask bot for customer personal identity - returns factual refusal and does not hallucinate customer names', async () => {
    const orders = serverStore.getOrders();

    const reply = await askSalesAssistant(
      undefined,
      'Who is our best customer?',
      orders,
      MENU_FIXTURE.groups
    );

    expect(reply.toolCall?.name).toBe('getUnavailableDataNotice');
    expect(reply.toolCall?.result.supported).toBe(false);
    expect(reply.text.toLowerCase()).toContain('not collected or stored');
  });

  it('AssistantChat UI renders suggestion chips and responds to prompt clicks', async () => {
    const orders = serverStore.getOrders();

    render(<AssistantChat orders={orders} groups={MENU_FIXTURE.groups} apiKey="" />);

    // Welcome message rendered
    expect(screen.getByText(/Hello! I am your breakfast sales assistant/i)).toBeInTheDocument();

    // Click on suggestion chip
    const orderPromptBtn = screen.getByRole('button', { name: /^How many orders\?$/i });
    expect(orderPromptBtn).toBeInTheDocument();

    fireEvent.click(orderPromptBtn);

    // Verify user message and assistant reply appear in chat log
    await waitFor(() => {
      expect(screen.getByText(/We currently have 6 completed order\(s\)/i)).toBeInTheDocument();
    });
  });
});
