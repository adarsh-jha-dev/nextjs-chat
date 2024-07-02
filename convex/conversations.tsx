import { ConvexError } from "convex/values";
import { MutationCtx, QueryCtx, query } from "./_generated/server";
import { getUserByClerkId } from "./_utils";
import { Id } from "./_generated/dataModel";

export const get = query({
  args: {},
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError("Unauthenticated");
    }
    const currentUser = await getUserByClerkId({
      ctx,
      clerkId: identity.subject,
    });
    if (!currentUser) {
      throw new ConvexError("User not found");
    }

    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_memberId", (q) => q.eq("memberId", currentUser._id))
      .collect();

    const conversations = await Promise.all(
      memberships.map(async (membership) => {
        const conversation = await ctx.db.get(membership.conversationId);

        if (!conversation) {
          throw new ConvexError("Conversation not found");
        }

        return conversation;
      })
    );

    const conversationWithDetails = await Promise.all(
      conversations.map(async (conversation, index) => {
        const allConversationMemberships = await ctx.db
          .query("conversationMembers")
          .withIndex("by_conversationId", (q) =>
            q.eq("conversationId", conversation?._id)
          )
          .collect();
        const lastMessage = await getLastMessageDetails({
          id: conversation.lastMessageId,
          ctx,
        });
        const lastSeenMessage = memberships[index].lastSeenMessage
          ? await ctx.db.get(memberships[index].lastSeenMessage!)
          : null;

        const lastSeenMessageTime = lastSeenMessage?._creationTime || -1;
        const unseenMessages = await ctx.db
          .query("messages")
          .withIndex("by_conversationId", (q) =>
            q.eq("conversationId", conversation._id)
          )
          .filter((q) => q.gt(q.field("_creationTime"), lastSeenMessageTime))
          .filter((q) => q.neq(q.field("senderId"), currentUser._id))
          .collect();
        if (conversation.isGroup) {
          return { conversation, lastMessage };
        } else {
          const otherMemberships = allConversationMemberships.filter(
            (membership) => membership.memberId !== currentUser._id
          )[0];

          const otherMember = await ctx.db.get(otherMemberships.memberId);

          return {
            conversation,
            otherMember,
            unseenCount: unseenMessages.length,
            lastMessage,
          };
        }
      })
    );

    return conversationWithDetails;
  },
});

const getMessageCotent = (type: string, content: string) => {
  switch (type) {
    case "text":
      return content;
    default:
      return "[Non-text]";
  }
};

const getLastMessageDetails = async ({
  ctx,
  id,
}: {
  ctx: QueryCtx | MutationCtx;
  id: Id<"messages"> | undefined;
}) => {
  if (!id) {
    return null;
  }
  const message = await ctx.db.get(id);
  if (!message) return null;
  const sender = await ctx.db.get(message.senderId);
  if (!sender) return null;
  const content = getMessageCotent(
    message.type,
    message.content as unknown as string
  );

  return {
    content,
    sender: sender.username,
  };
};
