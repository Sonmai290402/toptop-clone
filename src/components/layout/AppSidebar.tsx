"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
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
import {
  ChevronsUpDown,
  Compass,
  Home,
  Search,
  UserCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { cn } from "cn";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";

const AppSideBar = () => {
  const t = useTranslations();
  const pathname = usePathname();
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

  const isActive = (href: string) => {
    return pathname === href;
  };

  return (
    <Sidebar collapsible="icon" data-state={state}>
      <SidebarContent className="p-2">
        <div className="flex justify-between items-center">
          {state === "expanded" && (
            <Image
              src="/images/Toptop_logo_dark.png"
              alt="Logo"
              width={150}
              height={30}
            />
          )}
          <SidebarTrigger />
        </div>
        <div className="my-8">
          <InputGroup className={cn("max-w-xs rounded-full", state === "expanded" && "py-6 px-2")}>
            <InputGroupInput placeholder={t("search")} />
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
          </InputGroup>
        </div>

        <SidebarMenu>
          {MENU_ITEMS.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                render={<a href={item.href} />}
                className={cn(
                  "px-4 py-6 mb-2 hover:text-primary rounded-full",
                  isActive(item.href) && "text-primary bg-accent",
                )}
              >
                {item.icon}
                <span className="text-base ml-2">{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter
        className={cn(
          "p-2",
          state === "expanded" ? "bg-accent rounded-full m-2" : "items-center",
        )}
      >
        <Popover>
          <PopoverTrigger
            render={
              <div className="flex items-center justify-between gap-2 cursor-pointer">
                <div
                  className={cn(
                    "flex gap-2 items-center",
                    state === "collapsed" && "justify-center",
                  )}
                >
                  <Avatar size={state === "expanded" ? "lg" : "sm"}>
                    <AvatarImage src="https://plus.unsplash.com/premium_photo-1677545183884-421157b2da02?q=80&w=1172&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=NHwxMjA3fDA%3D" />
                    <AvatarFallback>USER</AvatarFallback>
                  </Avatar>
                  {state === "expanded" && (
                    <div>
                      <p>Username</p>
                      <p className="text-sm text-muted-foreground">
                        @tuikycuc2847124
                      </p>
                    </div>
                  )}
                </div>

                {state === "expanded" && (
                  <Button variant="ghost" size="icon">
                    <ChevronsUpDown />
                  </Button>
                )}
              </div>
            }
          />
          <PopoverContent className="w-30" align="end">
            <p> Xem hồ Sơ</p>
            <div className="flex gap-2">
              <span>Dark</span>
              <Switch />
            </div>
            <p>Language</p>
            <p>Đăng xuất</p>
          </PopoverContent>
        </Popover>
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSideBar;
