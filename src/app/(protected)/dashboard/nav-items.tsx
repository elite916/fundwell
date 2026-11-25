'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export interface NavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
}

export const navItems: NavItem[] = [
  { href: '/dashboard', label: 'My Contests' },
  { href: '/dashboard/account', label: 'Account' },
  { href: '/dashboard/billing', label: 'Billing' },
];

interface NavItemsProps {
  onClick?: () => void;
  isAdmin: boolean;
  className?: string;
}

export function NavItems({ onClick, isAdmin, className }: NavItemsProps) {
  const pathname = usePathname();

  return (
    <>
      {navItems
        .filter((item) => isAdmin || !item.adminOnly)
        .map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClick}
              aria-current={isActive ? 'page' : undefined}
              className={className}
            >
              {item.label}
            </Link>
          );
        })}
    </>
  );
}
