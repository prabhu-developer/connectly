import type { ChatMessage, ConversationSummary } from "../types/chat";

export const CURRENT_USER_MOCK = {
  id: "user-alice",
  username: "alice",
  displayName: "Alice Smith",
  email: "alice@connectly.local",
};

export const MOCK_CONVERSATIONS: ConversationSummary[] = [
  {
    id: "conv-1",
    participant: {
      id: "user-bob",
      username: "bob",
      displayName: "Bob Jones",
      isOnline: true,
    },
    lastMessage: {
      content: "Sounds great! Let's review the real-time socket architecture tomorrow.",
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
      senderId: "user-bob",
      status: "read",
    },
    unreadCount: 0,
    updatedAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
  {
    id: "conv-2",
    participant: {
      id: "user-charlie",
      username: "charlie",
      displayName: "Charlie Davis",
      isOnline: false,
      lastSeenAt: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
    },
    lastMessage: {
      content: "Did you push the latest Next.js 16 updates to the monorepo?",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
      senderId: "user-charlie",
      status: "delivered",
    },
    unreadCount: 2,
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
];

export const MOCK_MESSAGES: Record<string, ChatMessage[]> = {
  "conv-1": [
    {
      id: "msg-101",
      conversationId: "conv-1",
      senderId: "user-alice",
      content: "Hey Bob! How is the message delivery pipeline looking?",
      status: "read",
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    },
    {
      id: "msg-102",
      conversationId: "conv-1",
      senderId: "user-bob",
      content: "Hey Alice! It's solid. Multi-session presence and conversation read cursors are both modeled.",
      status: "read",
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    },
    {
      id: "msg-103",
      conversationId: "conv-1",
      senderId: "user-alice",
      content: "Awesome. I'm finishing the chat UI components now with responsive mobile layouts and theme support.",
      status: "read",
      createdAt: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
    },
    {
      id: "msg-104",
      conversationId: "conv-1",
      senderId: "user-bob",
      content: "Sounds great! Let's review the real-time socket architecture tomorrow.",
      status: "read",
      createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    },
  ],
  "conv-2": [
    {
      id: "msg-201",
      conversationId: "conv-2",
      senderId: "user-alice",
      content: "Hi Charlie, let me know when you get a chance to test the login flow.",
      status: "delivered",
      createdAt: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    },
    {
      id: "msg-202",
      conversationId: "conv-2",
      senderId: "user-charlie",
      content: "Hey Alice, will test shortly. Did you push the latest Next.js 16 updates to the monorepo?",
      status: "delivered",
      createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    },
  ],
};

