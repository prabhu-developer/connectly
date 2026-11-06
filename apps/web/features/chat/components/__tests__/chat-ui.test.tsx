import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { MessageBubble } from "../MessageBubble";
import { MessageComposer } from "../MessageComposer";
import { ConversationList } from "../ConversationList";
import { ActiveConversationView } from "../ActiveConversationView";
import { EmptyState } from "../EmptyState";
import { NewChatModal } from "../NewChatModal";
import { ProfileModal } from "../ProfileModal";
import { ParticipantProfileModal } from "../ParticipantProfileModal";
import { SettingsModal } from "../SettingsModal";
import { ThemeToggle } from "../../../../components/theme-toggle";
import { SocketContext } from "../../context/SocketContext";
import { formatLastSeen } from "../../hooks/usePresence";
import { chatApi } from "../../services/chat.api";
import { userApi } from "../../../auth/services/user.api";
import type { ChatMessage, ConversationSummary, ChatParticipant } from "../../types/chat";
import type { AuthUserDto } from "@repo/contracts/auth";

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

  it("renders image attachment and opens lightbox modal when clicked", () => {
    const imgMessage: ChatMessage = {
      ...baseMessage,
      attachment: {
        url: "/api/media/vacation.jpg",
        type: "image",
        name: "vacation.jpg",
        size: 512000,
        mimeType: "image/jpeg",
      },
    };

    render(<MessageBubble message={imgMessage} isCurrentUser={true} />);

    const img = screen.getByTestId("attachment-image");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/api/media/vacation.jpg");

    // Click image to open lightbox modal
    fireEvent.click(img);
    expect(screen.getByTestId("image-lightbox-modal")).toBeInTheDocument();
    expect(screen.getByText("vacation.jpg")).toBeInTheDocument();

    // Click close button
    const closeBtn = screen.getByTitle("Close");
    fireEvent.click(closeBtn);
    expect(screen.queryByTestId("image-lightbox-modal")).not.toBeInTheDocument();
  });

  it("renders document attachment card with file details and download link", () => {
    const fileMessage: ChatMessage = {
      ...baseMessage,
      attachment: {
        url: "/api/media/invoice.pdf",
        type: "file",
        name: "invoice.pdf",
        size: 1048576,
        mimeType: "application/pdf",
      },
    };

    render(<MessageBubble message={fileMessage} isCurrentUser={false} />);

    const fileCard = screen.getByTestId("attachment-file");
    expect(fileCard).toBeInTheDocument();
    expect(screen.getByText("invoice.pdf")).toBeInTheDocument();
    expect(screen.getByText("1.0 MB")).toBeInTheDocument();
    expect(fileCard).toHaveAttribute("href", "/api/media/invoice.pdf?download=1");
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

  it("handles file attachment upload, displays preview pill, and removes attachment", async () => {
    const uploadSpy = vi.spyOn(chatApi, "uploadMedia").mockResolvedValueOnce({
      url: "/api/media/doc.pdf",
      type: "file",
      name: "doc.pdf",
      size: 2048,
      mimeType: "application/pdf",
    });

    const handleSend = vi.fn();
    render(<MessageComposer onSendMessage={handleSend} />);

    const fileInput = screen.getByTestId("file-attachment-input");
    const fakeFile = new File(["test-content"], "doc.pdf", { type: "application/pdf" });

    await act(async () => {
      fireEvent.change(fileInput, { target: { files: [fakeFile] } });
    });

    expect(uploadSpy).toHaveBeenCalledWith(fakeFile);
    expect(screen.getByTestId("attachment-preview")).toBeInTheDocument();
    expect(screen.getByText("doc.pdf")).toBeInTheDocument();

    // Send button should be enabled even without text content
    const sendButton = screen.getByLabelText("Send message");
    expect(sendButton).not.toBeDisabled();

    // Remove attachment
    const removeBtn = screen.getByLabelText("Remove attachment");
    fireEvent.click(removeBtn);
    expect(screen.queryByTestId("attachment-preview")).not.toBeInTheDocument();
    expect(sendButton).toBeDisabled();
  });

  it("rejects files larger than 10MB with an error alert", async () => {
    render(<MessageComposer onSendMessage={vi.fn()} />);

    const fileInput = screen.getByTestId("file-attachment-input");
    const largeFile = new File([new ArrayBuffer(11 * 1024 * 1024)], "huge.pdf", {
      type: "application/pdf",
    });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByRole("alert")).toHaveTextContent("File size exceeds 10MB limit");
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

  it("opens message search panel, performs search and shows matches", async () => {
    const searchSpy = vi.spyOn(chatApi, "searchMessages").mockResolvedValueOnce([
      {
        message: {
          id: "msg-1",
          conversationId: "conv-1",
          senderId: "user-bob",
          content: "Hello Alice!",
          status: "read",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        matchSnippet: "Hello Alice!",
      },
    ]);

    render(
      <ActiveConversationView
        conversationId="conv-1"
        participant={participant}
        messages={messages}
        currentUserId="user-alice"
        onSendMessage={vi.fn()}
      />
    );

    // Click search button
    const searchBtn = screen.getByTestId("conversation-search-button");
    fireEvent.click(searchBtn);

    expect(screen.getByTestId("conversation-search-panel")).toBeInTheDocument();
    const searchInput = screen.getByTestId("conversation-search-input");

    await act(async () => {
      fireEvent.change(searchInput, { target: { value: "Hello" } });
    });

    expect(searchSpy).toHaveBeenCalledWith("conv-1", "Hello");
    expect(screen.getByTestId("conversation-search-results")).toBeInTheDocument();
    expect(screen.getByText("1 match")).toBeInTheDocument();
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

describe("ProfileModal", () => {
  const mockUser: AuthUserDto = {
    id: "user-123",
    email: "alice@example.com",
    username: "alice",
    displayName: "Alice Smith",
    bio: "Hey there!",
    createdAt: new Date().toISOString(),
  };

  it("does not render when isOpen is false", () => {
    render(
      <ProfileModal
        isOpen={false}
        onClose={vi.fn()}
        currentUser={mockUser}
        onProfileUpdated={vi.fn()}
      />
    );
    expect(screen.queryByTestId("profile-modal")).not.toBeInTheDocument();
  });

  it("renders user information when isOpen is true", () => {
    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
        currentUser={mockUser}
        onProfileUpdated={vi.fn()}
      />
    );

    expect(screen.getByTestId("profile-modal")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alice Smith")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Hey there!")).toBeInTheDocument();
    expect(screen.getByText("@alice")).toBeInTheDocument();
    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
  });

  it("submits updated display name and bio", async () => {
    const updateSpy = vi.spyOn(userApi, "updateProfile").mockResolvedValueOnce({
      ...mockUser,
      displayName: "Alice Wonderland",
      bio: "Available",
      updatedAt: new Date().toISOString(),
    });
    const handleUpdated = vi.fn();

    render(
      <ProfileModal
        isOpen={true}
        onClose={vi.fn()}
        currentUser={mockUser}
        onProfileUpdated={handleUpdated}
      />
    );

    const nameInput = screen.getByTestId("profile-display-name-input");
    fireEvent.change(nameInput, { target: { value: "Alice Wonderland" } });

    // Click quick status preset
    const availableBtn = screen.getByText("Available");
    fireEvent.click(availableBtn);

    const saveBtn = screen.getByTestId("save-profile-button");
    await act(async () => {
      fireEvent.click(saveBtn);
    });

    expect(updateSpy).toHaveBeenCalledWith({
      displayName: "Alice Wonderland",
      bio: "Available",
      avatarUrl: null,
    });
    expect(handleUpdated).toHaveBeenCalledWith({
      displayName: "Alice Wonderland",
      bio: "Available",
      avatarUrl: undefined,
    });
  });
});

describe("ParticipantProfileModal", () => {
  const participant: ChatParticipant = {
    id: "p-456",
    username: "bob",
    displayName: "Bob Jones",
    bio: "Busy coding",
    isOnline: true,
  };

  it("does not render when isOpen is false", () => {
    render(
      <ParticipantProfileModal
        isOpen={false}
        onClose={vi.fn()}
        participant={participant}
        isOnline={true}
      />
    );
    expect(screen.queryByTestId("participant-profile-modal")).not.toBeInTheDocument();
  });

  it("renders participant contact details when isOpen is true", () => {
    render(
      <ParticipantProfileModal
        isOpen={true}
        onClose={vi.fn()}
        participant={participant}
        isOnline={true}
      />
    );

    expect(screen.getByTestId("participant-profile-modal")).toBeInTheDocument();
    expect(screen.getByText("Bob Jones")).toBeInTheDocument();
    expect(screen.getByText("bob")).toBeInTheDocument();
    expect(screen.getByText("Busy coding")).toBeInTheDocument();
    expect(screen.getByText("Online now")).toBeInTheDocument();
  });
});

describe("SettingsModal", () => {
  it("does not render when isOpen is false", () => {
    render(<SettingsModal isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId("settings-modal")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true and shows theme, notifications and chat controls", async () => {
    vi.spyOn(userApi, "getSettings").mockResolvedValueOnce({
      soundEnabled: true,
      enterToSend: true,
      desktopNotifications: false,
      theme: "system",
    });

    await act(async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    });

    expect(screen.getByTestId("settings-modal")).toBeInTheDocument();
    expect(screen.getByText("Theme & Appearance")).toBeInTheDocument();
    expect(screen.getByText("Message Sounds")).toBeInTheDocument();
    expect(screen.getByText("Press Enter to Send")).toBeInTheDocument();
  });

  it("toggles sound and enter-to-send settings", async () => {
    vi.spyOn(userApi, "getSettings").mockResolvedValueOnce({
      soundEnabled: true,
      enterToSend: true,
      desktopNotifications: false,
      theme: "system",
    });
    const updateSpy = vi.spyOn(userApi, "updateSettings").mockResolvedValue({
      soundEnabled: false,
      enterToSend: false,
      desktopNotifications: false,
      theme: "system",
    });

    await act(async () => {
      render(<SettingsModal isOpen={true} onClose={vi.fn()} />);
    });

    const soundToggle = screen.getByTestId("toggle-sound");
    await act(async () => {
      fireEvent.click(soundToggle);
    });
    expect(updateSpy).toHaveBeenCalledWith({ soundEnabled: false });

    const enterToggle = screen.getByTestId("toggle-enter-to-send");
    await act(async () => {
      fireEvent.click(enterToggle);
    });
    expect(updateSpy).toHaveBeenCalledWith({ enterToSend: false });
  });
});
