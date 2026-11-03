import bcryptjs from "bcryptjs";
import { connectDatabase, disconnectDatabase } from "./connection.js";
import { User } from "../models/user.model.js";
import { Conversation, createParticipantKey } from "../models/conversation.model.js";
import { Message } from "../models/message.model.js";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";

export async function seedDevelopmentDatabase(): Promise<{
  usersCount: number;
  conversationsCount: number;
  messagesCount: number;
}> {
  if (env.NODE_ENV === "production") {
    throw new Error("❌ Danger: Seed script cannot be run in production environment!");
  }

  logger.info("🌱 Seeding development database...");

  // Password for all demo accounts: Password123!
  const passwordHash = await bcryptjs.hash("Password123!", 10);

  // 1. Seed Demo Users
  const demoUsersData = [
    {
      email: "alice@connectly.dev",
      username: "alice",
      displayName: "Alice Johnson",
      bio: "Product designer & coffee enthusiast.",
      avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      passwordHash,
    },
    {
      email: "bob@connectly.dev",
      username: "bob",
      displayName: "Bob Smith",
      bio: "Full-stack engineer building real-time applications.",
      avatarUrl: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      passwordHash,
    },
    {
      email: "charlie@connectly.dev",
      username: "charlie",
      displayName: "Charlie Davis",
      bio: "DevOps & open source advocate.",
      avatarUrl: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
      passwordHash,
    },
  ];

  const users = await Promise.all(
    demoUsersData.map(async (userData) => {
      let user = await User.findOne({ username: userData.username });
      if (!user) {
        user = await User.create(userData);
        logger.info(`  👤 Created demo user: @${user.username} (${user.email})`);
      } else {
        logger.info(`  👤 Demo user already exists: @${user.username}`);
      }
      return user;
    })
  );

  const [alice, bob] = users;
  if (!alice || !bob) {
    throw new Error("Failed to initialize Alice or Bob demo users");
  }

  // 2. Seed 1-to-1 Conversation between Alice and Bob
  const participantKey = createParticipantKey(alice._id, bob._id);
  let conversation = await Conversation.findOne({ participantKey });

  if (!conversation) {
    conversation = await Conversation.create({
      participants: [alice._id, bob._id],
      participantKey,
      readCursors: [
        {
          userId: alice._id,
          lastReadMessageId: alice._id, // placeholder, updated after messages
          readAt: new Date(),
        },
      ],
    });
    logger.info(`  💬 Created demo 1-to-1 conversation between @alice and @bob`);
  } else {
    logger.info(`  💬 Demo conversation between @alice and @bob already exists`);
  }

  // 3. Seed Sample Messages if none exist
  const existingMessagesCount = await Message.countDocuments({
    conversationId: conversation._id,
  });

  let createdMessagesCount = 0;
  if (existingMessagesCount === 0) {
    const now = Date.now();
    const msg1 = await Message.create({
      conversationId: conversation._id,
      senderId: alice._id,
      clientTempId: "seed-msg-1",
      content: "Hey Bob! How is the real-time chat architecture coming along?",
      status: "read",
      createdAt: new Date(now - 600000), // 10 mins ago
    });

    const msg2 = await Message.create({
      conversationId: conversation._id,
      senderId: bob._id,
      clientTempId: "seed-msg-2",
      content: "Hey Alice! The database models and compound unique indexes are in place.",
      status: "read",
      createdAt: new Date(now - 300000), // 5 mins ago
    });

    const msg3 = await Message.create({
      conversationId: conversation._id,
      senderId: alice._id,
      clientTempId: "seed-msg-3",
      content: "Awesome! Looking forward to testing real-time socket delivery.",
      status: "delivered",
      createdAt: new Date(now - 60000), // 1 min ago
    });

    // Update conversation lastMessage and readCursors
    conversation.lastMessageId = msg3._id;
    conversation.lastMessageAt = msg3.createdAt;
    conversation.readCursors = [
      {
        userId: alice._id,
        lastReadMessageId: msg3._id,
        readAt: msg3.createdAt,
      },
      {
        userId: bob._id,
        lastReadMessageId: msg2._id,
        readAt: msg2.createdAt,
      },
    ];
    await conversation.save();

    createdMessagesCount = 3;
    logger.info(`  ✉️ Seeded ${createdMessagesCount} sample messages`);
  }

  logger.info("✅ Database seeding completed successfully.");

  return {
    usersCount: users.length,
    conversationsCount: 1,
    messagesCount: existingMessagesCount + createdMessagesCount,
  };
}

// Direct execution entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  connectDatabase()
    .then(() => seedDevelopmentDatabase())
    .then(() => disconnectDatabase())
    .catch((err) => {
      logger.error(err, "Seed script failed");
      process.exit(1);
    });
}

