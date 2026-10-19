import Image from "next/image";
import {
  Sidebar,
  SidebarContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Compass, Home, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../ui/input-group";

const AppSideBar = () => {
  const t = useTranslations();
  const MENU_ITEMS = [
    { label: t("for-you"), href: "/", icon: <Home /> },
    { label: t("explore"), href: "/explore", icon: <Compass /> },
  ];

  return (
    <Sidebar>
      <SidebarContent className="p-4">
        <div>
          <Image
            src="/images/Toptop_logo_dark.png"
            alt="Logo"
            width={150}
            height={30}
          />
        </div>
        <div>
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
              <SidebarMenuButton render={<a href={item.href} />}>
                {item.icon}
                <span>{item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
    </Sidebar>
  );
};

export default AppSideBar;
