"use client";

import type React from "react";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  LayoutDashboard,
  Package,
  Upload,
  MessageSquare,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface UserData {
  uid: string;
  email: string;
  name: string;
  role: string;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] = useState<UserData | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("session_token");
    const userData = localStorage.getItem("user_data");

    if (!token || !userData) {
      router.push("/auth/login");
      return;
    }

    try {
      setUser(JSON.parse(userData));
    } catch (error) {
      router.push("/auth/login");
    }
  }, [router]);

  const handleLogout = async () => {
    const token = localStorage.getItem("session_token");

    try {
      await fetch("https://znlm131v-5000.inc1.devtunnels.ms/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      // Continue with logout even if API call fails
    }

    localStorage.removeItem("session_token");
    localStorage.removeItem("user_data");

    toast({
      title: "Logged out successfully",
      description: "You have been signed out of your account.",
    });

    router.push("/");
  };

  const navigation = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "Resources", href: "/dashboard/resources", icon: Package },
    { name: "File Management", href: "/dashboard/files", icon: Upload },
    { name: "AI Assistant", href: "/dashboard/ai", icon: MessageSquare },
  ];

  const isActive = (href: string) => pathname === href;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="relative">
          <div className="animate-spin rounded-full h-32 w-32 border-b-4 border-blue-600"></div>
          <div
            className="absolute inset-0 rounded-full h-32 w-32 border-t-4 border-purple-600 animate-spin"
            style={{ animationDirection: "reverse", animationDuration: "1.5s" }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-80 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:flex lg:flex-col
        `}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-20 px-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-white/20 rounded-2xl">
              <Building2 className="h-8 w-8 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">
                Campus Assets
              </span>
              <p className="text-xs text-blue-100">Smart Management</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden text-white hover:bg-white/20 rounded-xl"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-8 overflow-y-auto">
          <div className="space-y-3">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`
                    flex items-center px-4 py-4 text-sm font-medium rounded-2xl transition-all duration-300
                    ${
                      isActive(item.href)
                        ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform scale-105"
                        : "text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-purple-50 hover:text-blue-700"
                    }
                  `}
                  onClick={() => setSidebarOpen(false)}
                >
                  <Icon className="mr-4 h-6 w-6" />
                  <span className="text-base">{item.name}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        {/* User Profile Section */}
        <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-gray-100 flex-shrink-0">
          <div className="flex items-center space-x-4 p-4 bg-white rounded-2xl shadow-md">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-bold text-lg">
                {user.name?.charAt(0)?.toUpperCase() ||
                  user.email?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
              <Badge
                variant={user.role === "admin" ? "default" : "secondary"}
                className="mt-1 text-xs rounded-full"
              >
                {user.role}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-xl border-b shadow-sm px-4 py-4 sm:px-6 lg:px-8 flex-shrink-0">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden rounded-xl hover:bg-blue-50"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>

            <div className="flex items-center space-x-4 ml-auto">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-10 w-10 rounded-2xl hover:bg-blue-50"
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                        {user.name?.charAt(0)?.toUpperCase() ||
                          user.email?.charAt(0)?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-64 rounded-2xl shadow-xl"
                  align="end"
                  forceMount
                >
                  <DropdownMenuLabel className="font-normal p-4">
                    <div className="flex flex-col space-y-2">
                      <p className="text-sm font-medium leading-none">
                        {user.name || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {user.email}
                      </p>
                      <Badge
                        variant={
                          user.role === "admin" ? "default" : "secondary"
                        }
                        className="w-fit text-xs rounded-full"
                      >
                        {user.role}
                      </Badge>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-xl mx-2 my-1">
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-xl mx-2 my-1 text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
