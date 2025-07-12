'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from './ThemeToggle';
import { Cloud, LogOut, User, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { menuItems } from './DashboardSidebar';
import * as SidebarIcons from 'lucide-react';

export function Header() {
  const { data: session } = useSession();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const pathname = usePathname();
  const isDashboard = pathname?.startsWith('/dashboard');

  useEffect(() => {
    // Check if registration is enabled
    const checkRegistrationStatus = async () => {
      try {
        const response = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: 'test@test.com', password: 'test' }),
        });
        
        if (response.status === 403) {
          setRegistrationEnabled(false);
        }
      } catch (error) {
        // If there's an error, assume registration is enabled
        setRegistrationEnabled(true);
      }
    };

    checkRegistrationStatus();
  }, []);

  return (
    <motion.header
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
    >
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Mobile Menu Button - Only show in dashboard */}
          {session && isDashboard && (
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
          )}
          <Link href="/" className="flex items-center space-x-2 min-w-0">
            <Cloud className="h-8 w-8 text-orange-500" />
            <span className="text-xl font-bold">SlotFlare Manager</span>
          </Link>
        </div>

        <div className="flex items-center space-x-4">
          {/* Hanya tampilkan ThemeToggle, email, dan Logout di desktop */}
          <div className="hidden md:flex items-center space-x-4">
            <ThemeToggle />
            {session ? (
              <>
                <div className="flex items-center space-x-2 text-sm">
                  <User className="h-4 w-4" />
                  <span>{session.user.email}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => signOut()}
                  className="flex items-center space-x-2"
                >
                  <LogOut className="h-4 w-4" />
                  <span>Logout</span>
                </Button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/login">Login</Link>
                </Button>
                {registrationEnabled && (
                  <Button asChild size="sm" className="bg-orange-500 hover:bg-orange-600">
                    <Link href="/register">Register</Link>
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      {session && isDashboard && (
        <>
          <motion.aside
            initial={false}
            animate={{
              x: isMobileMenuOpen ? 0 : '-100%',
            }}
            className={cn(
              'fixed inset-0 z-50 w-64 bg-background border-r md:hidden',
              'shadow-lg h-screen flex flex-col'
            )}
          >
            <div className="p-6 flex-1 flex flex-col">
              <h2 className="text-lg font-semibold mb-6">Dashboard</h2>
              <nav className="space-y-2 mb-8">
                {menuItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href}>
                      <Button
                        variant={isActive ? 'secondary' : 'ghost'}
                        className={cn(
                          'w-full justify-start',
                          isActive && 'bg-orange-500/10 text-orange-500 hover:bg-orange-500/20'
                        )}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <Icon className="h-4 w-4 mr-2" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>
              {/* Tambahkan ThemeToggle, email, dan Logout di bawah menu */}
              <div className="mt-auto flex flex-col gap-4">
                <ThemeToggle />
                {session && (
                  <>
                    <div className="flex items-center space-x-2 text-sm">
                      <User className="h-4 w-4" />
                      <span>{session.user.email}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => { setIsMobileMenuOpen(false); signOut(); }}
                      className="flex items-center space-x-2"
                    >
                      <LogOut className="h-4 w-4" />
                      <span>Logout</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </motion.aside>

          {/* Mobile Overlay */}
          {isMobileMenuOpen && (
            <div
              className="fixed inset-0 z-30 bg-black/50 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
          )}
        </>
      )}
    </motion.header>
  );
}