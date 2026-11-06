import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import { MessageComposer } from "../MessageComposer";
import { ConversationList } from "../ConversationList";
import { ActiveConversationView } from "../ActiveConversationView";
import { EmptyState } from "../EmptyState";
import { NewChatModal } from "../NewChatModal";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { SocketContext } from "../../context/SocketContext";
import { formatLastSeen } from "../../hooks/usePresence";
import type { ChatMessage, ConversationSummary, ChatParticipant } from "../../types/chat";

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

  it("uses real-time socket presence when available in context", () => {
    const handleSelect = vi.fn();
    const mockSocketContext = {
      socket: null,
      isConnected: true,
      onlineUserIds: new Set(["p-2"]), // charlie is dynamically online via socket
      typingUsers: {},
      isUserOnline: (id: string) => id === "p-2",
      sendTypingStart: vi.fn(),
      sendTypingStop: vi.fn(),
      joinConversation: vi.fn(),
      leaveConversation: vi.fn(),
    };

    render(
      <SocketContext.Provider value={mockSocketContext}>
        <ConversationList
          conversations={mockConversations}
          selectedConversationId={null}
          onSelectConversation={handleSelect}
        />
      </SocketContext.Provider>
    );

    // Charlie should have the Online badge now
    const onlineBadges = screen.getAllByTitle("Online");
    expect(onlineBadges).toHaveLength(2); // Bob (mock default) + Charlie (socket online)
  });
});

describe("ActiveConversationView & Presence", () => {
  const participant: ChatParticipant = {
    id: "user-bob",
    username: "bob",
    displayName: "Bob Jones",
    isOnline: true,
  };

  const messages: ChatMessage[] = [
    {
      id: "msg-1",
      conversationId: "conv-1",
      senderId: "user-bob",
      content: "Hello Alice!",
      status: "read",
      createdAt: new Date().toISOString(),
    },
  ];

  it("renders active conversation with header, message bubble, and composer", () => {
    const handleSend = vi.fn();
    render(
      <ActiveConversationView
        conversationId="conv-1"
        participant={participant}
        messages={messages}
        currentUserId="user-alice"
        onSendMessage={handleSend}
      />
    );

    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("Hello Alice!")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Type a message...")).toBeInTheDocument();
  });

  it("displays real-time typing indicator when a user is typing", () => {
    const mockSocketContext = {
      socket: null,
      isConnected: true,
      onlineUserIds: new Set(["user-bob"]),
      typingUsers: { "conv-1": ["Bob"] },
      isUserOnline: (id: string) => id === "user-bob",
      sendTypingStart: vi.fn(),
      sendTypingStop: vi.fn(),
      joinConversation: vi.fn(),
      leaveConversation: vi.fn(),
    };

    render(
      <SocketContext.Provider value={mockSocketContext}>
        <ActiveConversationView
          conversationId="conv-1"
          participant={participant}
          messages={messages}
          currentUserId="user-alice"
          onSendMessage={vi.fn()}
        />
      </SocketContext.Provider>
    );

    expect(screen.getByText("Bob is typing...")).toBeInTheDocument();
  });
});

describe("formatLastSeen utility", () => {
  it("formats recent timestamps properly", () => {
    expect(formatLastSeen()).toBe("Offline");

    const justNow = new Date(Date.now() - 30 * 1000).toISOString();
    expect(formatLastSeen(justNow)).toBe("Last seen just now");

    const tenMins = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    expect(formatLastSeen(tenMins)).toBe("Last seen 10m ago");

    const threeHours = new Date(Date.now() - 3 * 3600 * 1000).toISOString();
    expect(formatLastSeen(threeHours)).toBe("Last seen 3h ago");
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

describe("NewChatModal", () => {
  it("does not render when isOpen is false", () => {
    render(<NewChatModal isOpen={false} onClose={vi.fn()} onSelectUser={vi.fn()} />);
    expect(screen.queryByText("New Conversation")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true and shows search input", () => {
    render(<NewChatModal isOpen={true} onClose={vi.fn()} onSelectUser={vi.fn()} />);
    expect(screen.getByText("New Conversation")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Search by username or name...")).toBeInTheDocument();
  });
});
