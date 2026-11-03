import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import { MessageComposer } from "../MessageComposer";
import { ConversationList } from "../ConversationList";
import { EmptyState } from "../EmptyState";
import { ThemeToggle } from "../../../../components/theme-toggle";
import type { ChatMessage, ConversationSummary } from "../../types/chat";

describe("MessageBubble", () => {
  const baseMessage: ChatMessage = {
    id: "m-1",
    conversationId: "conv-1",
    senderId: "user-1",
    content: "Hello world!",
    status: "read",
    createdAt: new Date("2026-01-01T12:00:00Z").toISOString(),
  };

  it("renders outgoing message with text and read receipt indicator", () => {
    render(<MessageBubble message={baseMessage} isCurrentUser={true} />);

    expect(screen.getByText("Hello world!")).toBeInTheDocument();
    expect(screen.getByLabelText("Status: read")).toBeInTheDocument();
  });

  it("renders incoming message without outgoing status indicator", () => {
    render(<MessageBubble message={baseMessage} isCurrentUser={false} />);

    expect(screen.getByText("Hello world!")).toBeInTheDocument();
    expect(screen.queryByLabelText(/Status:/)).not.toBeInTheDocument();
  });
});

describe("MessageComposer", () => {
  it("enables send button and submits message on click", () => {
    const handleSend = vi.fn();
    render(<MessageComposer onSendMessage={handleSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    const sendButton = screen.getByLabelText("Send message");

    expect(sendButton).toBeDisabled();

    fireEvent.change(textarea, { target: { value: "Testing chat composer" } });
    expect(sendButton).not.toBeDisabled();

    fireEvent.click(sendButton);
    expect(handleSend).toHaveBeenCalledWith("Testing chat composer");
    expect(textarea).toHaveValue("");
  });

  it("submits message on Enter key without Shift", () => {
    const handleSend = vi.fn();
    render(<MessageComposer onSendMessage={handleSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Message on Enter" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

    expect(handleSend).toHaveBeenCalledWith("Message on Enter");
  });

  it("does not submit on Shift+Enter", () => {
    const handleSend = vi.fn();
    render(<MessageComposer onSendMessage={handleSend} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "Multiline text" } });
    fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

    expect(handleSend).not.toHaveBeenCalled();
  });

  it("does not send when empty or disabled", () => {
    const handleSend = vi.fn();
    render(<MessageComposer onSendMessage={handleSend} disabled={true} />);

    const textarea = screen.getByPlaceholderText("Type a message...");
    fireEvent.change(textarea, { target: { value: "   " } });
    const sendButton = screen.getByLabelText("Send message");
    expect(sendButton).toBeDisabled();
  });
});

describe("ConversationList", () => {
  const mockConversations: ConversationSummary[] = [
    {
      id: "c-1",
      participant: {
        id: "p-1",
        username: "bob",
        displayName: "Bob Jones",
        isOnline: true,
      },
      lastMessage: {
        content: "See you later",
        createdAt: new Date().toISOString(),
        senderId: "p-1",
      },
      unreadCount: 3,
      updatedAt: new Date().toISOString(),
    },
    {
      id: "c-2",
      participant: {
        id: "p-2",
        username: "charlie",
        displayName: "Charlie Davis",
        isOnline: false,
      },
      lastMessage: {
        content: "Working on the backend",
        createdAt: new Date().toISOString(),
        senderId: "p-2",
      },
      unreadCount: 0,
      updatedAt: new Date().toISOString(),
    },
  ];

  it("renders conversations with unread badge and online status", () => {
    const handleSelect = vi.fn();
    render(
      <ConversationList
        conversations={mockConversations}
        selectedConversationId={null}
        onSelectConversation={handleSelect}
      />
    );

    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("See you later")).toBeInTheDocument();
    expect(screen.getByLabelText("3 unread messages")).toBeInTheDocument();
    expect(screen.getByTitle("Online")).toBeInTheDocument();

    expect(screen.getByText("Charlie Davis")).toBeInTheDocument();
  });

  it("calls onSelectConversation when clicked", () => {
    const handleSelect = vi.fn();
    render(
      <ConversationList
        conversations={mockConversations}
        selectedConversationId={null}
        onSelectConversation={handleSelect}
      />
    );

    fireEvent.click(screen.getByText("Bob Jones"));
    expect(handleSelect).toHaveBeenCalledWith("c-1");
  });

  it("filters conversations by search query", () => {
    const handleSelect = vi.fn();
    render(
      <ConversationList
        conversations={mockConversations}
        selectedConversationId={null}
        onSelectConversation={handleSelect}
        searchQuery="Charlie"
      />
    );

    expect(screen.queryByText("Bob Jones")).not.toBeInTheDocument();
    expect(screen.getByText("Charlie Davis")).toBeInTheDocument();
  });
});

describe("EmptyState", () => {
  it("renders default title and description", () => {
    render(<EmptyState />);
    expect(screen.getByText("No conversation selected")).toBeInTheDocument();
  });

  it("renders custom title and description", () => {
    render(<EmptyState title="Custom Title" description="Custom Description" />);
    expect(screen.getByText("Custom Title")).toBeInTheDocument();
    expect(screen.getByText("Custom Description")).toBeInTheDocument();
  });
});

describe("ThemeToggle", () => {
  it("renders theme toggle button", () => {
    render(<ThemeToggle />);
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });
});

