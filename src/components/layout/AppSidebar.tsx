"use client";

import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Compass, Home, Search, UserCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "cn";

const AppSideBar = () => {
  const t = useTranslations();
  const { state } = useSidebar();
  const MENU_ITEMS = [
    { label: t("for-you"), href: "/", icon: <Home className="w-5! h-5!" /> },
    {
      label: t("explore"),
      href: "/explore",
      icon: <Compass className="w-5! h-5!" />,
    },
    {
      label: t("following"),
      href: "/following",
      icon: <UserCheck className="w-5! h-5!" />,
    },
  ];

  return (
    <Sidebar collapsible="icon" data-state={state}>
      <SidebarContent className="p-2">
        <div className="flex justify-between items-center">
          {state === "expanded" && 
          <Image
            src="/images/Toptop_logo_dark.png"
            alt="Logo"
            width={150}
            height={30}
          />}
          <SidebarTrigger />
          
        </div>
        <div className="my-4">
          <InputGroup className="max-w-xs rounded-full">
            <InputGroupInput placeholder={t("search")} />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            {/* <InputGroupAddon align="inline-end">12 results</InputGroupAddon> */}
          </InputGroup>
        </div>

        <SidebarMenu>
          {MENU_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<a href={item.href} />}
                className="px-2 py-6"
              >
                {item.icon}
                <span className="text-base ml-2">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <div className={cn("flex gap-2 items-center", state === "collapsed" && "justify-center")}>
          <Avatar size={state === "expanded" ? "lg" : "sm"}>
            <AvatarImage src="https://plus.unsplash.com/premium_photo-1677545183884-421157b2da02?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D" />
            <AvatarFallback>USER</AvatarFallback>
          </Avatar>
          {state === "expanded" && (
            <div>
              <p>Username</p>
              <p className="text-sm text-muted-foreground">@tuikycuc2847124</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSideBar;
