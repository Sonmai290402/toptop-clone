"use client";

import Image from "next/image";
import Link from "next/link";
import SidebarAccount from "@/components/auth/SidebarAccount";
import { useAuth } from "@/providers/AuthProvider";
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
import { Home, Search, UserCheck, UploadCloud } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";
import { cn } from "cn";

const AppSideBar = () => {
  const t = useTranslations();
  const pathname = usePathname();
  const { state } = useSidebar();
  const { requireAuth, isLoading } = useAuth();
  const MENU_ITEMS = [
    { label: t("for-you"), href: "/", icon: <Home className="w-5! h-5!" /> },
    // {
    //   label: t("explore"),
    //   href: "/explore",
    //   icon: <Compass className="w-5! h-5!" />,
    // },
    {
      label: t("following"),
      href: "/following",
      icon: <UserCheck className="w-5! h-5!" />,
    },
    {
      label: "Upload",
      href: "/upload",
      icon: <UploadCloud className="w-5! h-5!" />,
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
          <InputGroup
            className={cn(
              "max-w-xs rounded-full",
              state === "expanded" && "py-6 px-2",
            )}
          >
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
                render={<Link href={item.href} />}
                aria-disabled={
                  ["/following", "/upload"].includes(item.href) && isLoading
                }
                onClick={(event) => {
                  if (
                    ["/following", "/upload"].includes(item.href) &&
                    !requireAuth("Sign in to continue.")
                  )
                    event.preventDefault();
                }}
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
      <SidebarFooter className="p-2">
        <SidebarAccount collapsed={state === "collapsed"} />
      </SidebarFooter>
    </Sidebar>
  );
};

export default AppSideBar;
