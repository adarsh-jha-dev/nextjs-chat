import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getUserByClerkId } from "./_utils";

export const get = query({
  args: {
    id: v.id("conversations"),
  },
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

    const conversation = await ctx.db.get(args.id);
    if (!conversation) {
      throw new ConvexError("Conversation not found");
    }
    const memberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_memberId", (q) =>
        q.eq("conversationId", args.id).eq("memberId", currentUser._id)
      )
      .unique();
    if (!memberships) {
      throw new ConvexError("You're not a member of this conversation");
    }
    const allConversationMemberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) => q.eq("conversationId", args.id))
      .collect();
    if (!conversation.isGroup) {
      const otherMembership = allConversationMemberships.filter(
        (membership) => membership.memberId !== currentUser._id
      )[0];
      const otherMemberDetails = await ctx.db.get(otherMembership.memberId);

      return {
        conversation,
        otherMember: {
          ...otherMemberDetails,
          lastSeenMessageId: otherMembership.lastSeenMessage,
        },
        otherMembers: null,
      };
    } else {
      const otherMembers = await Promise.all(
        allConversationMemberships
          .filter((membership) => membership.memberId !== currentUser._id)
          .map(async (membership) => {
            const member = await ctx.db.get(membership.memberId);
            if (!member) {
              throw new ConvexError("Member not found");
            }
            return {
              _id: member._id,
              username: member.username,
            };
          })
      );
      return { conversation, otherMembers, otherMember: null };
    }
  },
});

export const createGroup = mutation({
  args: {
    members: v.array(v.id("users")),
    name: v.string(),
  },
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
    const conversationId = await ctx.db.insert("conversations", {
      isGroup: true,
      name: args.name,
    });
    await Promise.all(
      [...args.members, currentUser._id].map(async (memberId) => {
        await ctx.db.insert("conversationMembers", {
          conversationId,
          memberId,
        });
      })
    );
  },
});

export const deleteGroup = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
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
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new ConvexError("Conversation not found");
    }
    const memeberships = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();

    if (!memeberships || memeberships.length <= 1) {
      throw new ConvexError("This conversation doesn't have any members");
    }
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_conversationId", (q) =>
        q.eq("conversationId", args.conversationId)
      )
      .collect();
    await ctx.db.delete(args.conversationId);
    await Promise.all(
      memeberships.map(async (membership) => {
        await ctx.db.delete(membership._id);
      })
    );
    await Promise.all(
      messages.map(async (message) => {
        await ctx.db.delete(message._id);
      })
    );
  },
});

export const leaveGroup = mutation({
  args: {
    conversationId: v.id("conversations"),
  },
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
    const conversation = await ctx.db.get(args.conversationId);
    if (!conversation) {
      throw new ConvexError("Conversation not found");
    }
    const memebership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_memberId", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("memberId", currentUser._id)
      )
      .unique();

    if (!memebership) {
      throw new ConvexError("You're not a member of this conversation");
    }
    await ctx.db.delete(memebership._id);
  },
});

export const markRead = mutation({
  args: {
    conversationId: v.id("conversations"),
    messageId: v.id("messages"),
  },
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
    const memebership = await ctx.db
      .query("conversationMembers")
      .withIndex("by_conversationId_memberId", (q) =>
        q
          .eq("conversationId", args.conversationId)
          .eq("memberId", currentUser._id)
      )
      .unique();

    if (!memebership) {
      throw new ConvexError("You're not a member of this conversation");
    }
    const lastMessage = await ctx.db.get(args.messageId);
    await ctx.db.patch(memebership._id, {
      lastSeenMessage: lastMessage ? lastMessage._id : undefined,
    });
  },
});
