import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { MessageSquare, Users } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export const useNavigation = () => {
  const pathname = usePathname();

  const requestsCount = useQuery(api.requests.count);
  const conversations = useQuery(api.conversations.get);

  const unseenMessagesCount = useMemo(() => {
    return conversations?.reduce((acc, curr) => {
      return acc + curr.unseenCount!;
    }, 0);
  }, []);

  const paths = useMemo(
    () => [
      {
        name: "Conversations",
        href: "/conversation",
        icon: MessageSquare,
        active: pathname.endsWith("/conversation"),
        count: unseenMessagesCount,
      },
      {
        name: "Friends",
        href: "/friends",
        icon: Users,
        active: pathname.endsWith("/friends"),
        count: requestsCount,
      },
    ],
    [pathname, requestsCount, unseenMessagesCount]
  );

  return paths;
};
