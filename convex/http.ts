import { httpRouter } from "convex/server";
import { httpAction, internalQuery } from "./_generated/server";
import { Webhook } from "svix";
import { internal } from "./_generated/api";
const http = httpRouter();

const validatePayload = async (req: Request) => {
  const payload = await req.text();
  const svixHeaders = {
    "svix-id": req.headers.get("svix-id")!,
    "svix-timestamp": req.headers.get("svix-timestamp")!,
    "svix-signature": req.headers.get("svix-signature")!,
  };

  const webhook = new Webhook(process.env.CLERK_WEBHOOK_SECRET || "");

  try {
    const event = webhook.verify(payload, svixHeaders);
    return event;
  } catch (error) {
    console.error(error);
    return null;
  }
};

const handlerClerkWebhook = httpAction(async (ctx, req) => {
  const event: any = await validatePayload(req);
  if (!event) {
    return new Response("Couldn't validate clerk payload", {
      status: 500,
    });
  }

  switch (event.type) {
    case "user.created": {
      const user = await ctx.runQuery(internal.user.get, {
        clerkId: event.data.id,
      });

      if (user) {
        console.log(
          "Updating user : ",
          event.data.id,
          "with email : ",
          event.data
        );
      }
    }
    case "user.updated": {
      console.log("Creating/updating  User : ", event.data.id);

      await ctx.runMutation(internal.user.create, {
        username: `${event.data.first_name} ${event.data.last_name}`,
        imageUrl: event.data.image_url,
        clerkId: event.data.id,
        email: event.data.email_addresses[0].email_address,
      });
      break;
    }
    default: {
      console.log("Clerk Webhook event not supported : ", event.type);
    }
  }

  return new Response(null, {
    status: 200,
  });
});

http.route({
  path: "/clerk-users-webhook",
  method: "POST",
  handler: handlerClerkWebhook,
});

export default http;
