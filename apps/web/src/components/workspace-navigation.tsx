import {
  ChevronsUpDown,
  CircleUserRound,
  House,
  LayoutDashboard,
  LogOut,
  Package,
  UsersRound,
} from "lucide-react"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  useSidebar,
} from "@workspace/ui/components/sidebar"
import type { Self } from "@/lib/api/accounts"

export const pageTitles = {
  dashboard: "仪表盘",
  inventory: "物资",
  members: "用户管理",
  profile: "个人中心",
} as const
export type Page = keyof typeof pageTitles
const navigation = [
  { page: "dashboard", icon: LayoutDashboard },
  { page: "inventory", icon: Package },
  { page: "members", icon: UsersRound },
] as const

export function WorkspaceNavigation({
  page,
  user,
  logout,
}: {
  page: Page
  user: Self
  logout: () => void
}) {
  const { isMobile, setOpenMobile } = useSidebar()
  const closeMobile = () => setOpenMobile(false)
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-12 items-center gap-3 px-2 group-data-[collapsible=icon]:px-0">
          <div className="grid size-8 shrink-0 place-items-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <House className="size-5" />
          </div>
          <div className="grid leading-tight group-data-[collapsible=icon]:hidden">
            <strong>homerp</strong>
            <span className="text-xs text-muted-foreground">家庭管理空间</span>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>工作台</SidebarGroupLabel>
          <nav aria-label="主导航">
            <SidebarMenu>
              {navigation.map(({ page: target, icon: Icon }) => (
                <SidebarMenuItem key={target}>
                  <SidebarMenuButton
                    className="h-10"
                    asChild
                    isActive={page === target}
                    tooltip={pageTitles[target]}
                  >
                    <a
                      href={"#" + target}
                      aria-label={pageTitles[target]}
                      aria-current={page === target ? "page" : undefined}
                      onClick={closeMobile}
                    >
                      <Icon />
                      <span>{pageTitles[target]}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </nav>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  isActive={page === "profile"}
                  aria-label="账户菜单"
                  tooltip="账户菜单"
                >
                  <Avatar>
                    <AvatarFallback>
                      {Array.from(user.member.name)[0]}
                    </AvatarFallback>
                  </Avatar>
                  <span className="grid min-w-0 flex-1 leading-tight">
                    <span className="truncate font-medium">
                      {user.member.name}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {user.email}
                    </span>
                  </span>
                  <ChevronsUpDown />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                side={isMobile ? "top" : "right"}
                sideOffset={6}
                className="min-w-44"
              >
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <a href="#profile" onClick={closeMobile}>
                      <CircleUserRound />
                      个人中心
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => {
                      closeMobile()
                      logout()
                    }}
                  >
                    <LogOut />
                    退出登录
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
