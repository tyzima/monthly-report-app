"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { LayoutDashboard, Package, ImageIcon, Store } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function GlobalHeader() {
  const pathname = usePathname();

  const navigationItems = [
    {
      href: '/',
      icon: LayoutDashboard,
      label: 'Overview',
      isActive: pathname === '/'
    },
    {
      href: '/mockups',
      icon: Package,
      label: 'Mockups',
      isActive: pathname === '/mockups'
    },
    {
      href: '/logos',
      icon: ImageIcon,
      label: 'Logos',
      isActive: pathname === '/logos'
    },
    {
      href: '/stores',
      icon: Store,
      label: 'Stores',
      isActive: pathname === '/stores'
    }
  ];

  const getPageTitle = () => {
    switch (pathname) {
      case '/': return 'Monthly Report Overview';
      case '/mockups': return 'Mockups Analytics';
      case '/logos': return 'Logos Analytics';
      case '/stores': return 'Stores Analytics';
      default: return 'Monthly Report Dashboard';
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6">
      <SidebarTrigger className="md:hidden" />
      
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{getPageTitle()}</h1>
        <Badge variant="outline" className="hidden sm:inline-flex">
          Last 30 Days
        </Badge>
      </div>
      
      <Separator orientation="vertical" className="h-6 hidden md:block" />
      
      <nav className="flex items-center gap-1">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          return (
            <Button
              key={item.href}
              variant={item.isActive ? "default" : "ghost"}
              size="sm"
              asChild
              className="gap-2"
            >
              <Link href={item.href}>
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>
      
      <div className="ml-auto flex items-center gap-2">
        <Badge variant="secondary" className="hidden lg:inline-flex">
          Real-time Data
        </Badge>
      </div>
    </header>
  );
}
