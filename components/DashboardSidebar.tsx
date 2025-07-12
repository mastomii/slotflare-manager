'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { 
  Globe, 
  Rocket, 
  Route, 
  Settings, 
  History,
  Menu,
  X,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Sheet, SheetTrigger, SheetContent } from '@/components/ui/sheet';

export const menuItems = [
  { href: '/dashboard', label: 'Overview', icon: Settings },
  { href: '/dashboard/domains', label: 'Domains', icon: Globe },
  { href: '/dashboard/scripts', label: 'Worker Scripts', icon: Rocket },
  { href: '/dashboard/routes', label: 'Domain Routes', icon: Route },
  { href: '/dashboard/history', label: 'Log History', icon: History },
  { href: '/dashboard/alerts', label: 'Trigger Alerts', icon: AlertTriangle },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  // const [open, setOpen] = useState(false); // Hapus state open

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.aside className="hidden md:block w-64 bg-background border-r pt-16">
        <div className="pr-6 border-r h-full">
          <h2 className="text-lg font-semibold mb-6">Dashboard</h2>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={cn(
                      'w-full justify-start',
                      isActive && 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
                    )}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>
      </motion.aside>
    </>
  );
}