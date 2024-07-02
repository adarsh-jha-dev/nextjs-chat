"use client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useConversation } from "@/hooks/useConversation";
import { useNavigation } from "@/hooks/useNavigation";
import { UserButton } from "@clerk/nextjs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Link from "next/link";
import React from "react";
import { Badge } from "@/components/ui/badge";

const MobileNav = () => {
  const paths = useNavigation();
  const { isActive } = useConversation();

  if (isActive) return null;
  return (
    <Card className="fixed bottom-4 flex items-center lg:hidden w-[calc(100vw - 32px)] h-16 p-2">
      <nav className="w-full">
        <ul className="flex justify-evenly items-center ">
          {paths.map((path, id) => (
            <li className="relative" key={id}>
              <Link href={path.href}>
                <Tooltip>
                  <TooltipTrigger>
                    <Button
                      size={"icon"}
                      variant={path.active ? "default" : "outline"}
                    >
                      {path.icon && <path.icon />}
                    </Button>
                    {path.count && path.count > 0 && (
                      <Badge className="absolute left-6 bottom-7 px-2">
                        {path.count}
                      </Badge>
                    )}
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{path.name}</p>
                  </TooltipContent>
                </Tooltip>
              </Link>
            </li>
          ))}
          <li>
            <ThemeToggle />
          </li>
          <li>
            <UserButton />
          </li>
        </ul>
      </nav>
    </Card>
  );
};

export default MobileNav;
