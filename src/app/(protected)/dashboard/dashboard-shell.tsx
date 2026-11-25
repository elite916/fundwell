'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Menu, X } from 'lucide-react';

import { IconButton } from '@/components/studio/dashboard/dash-button';
import { dashTheme } from '@/components/studio/dashboard/dash-page';
import { signOut } from '@/features/auth/auth-actions';
import { cn } from '@/utils/cn';
import * as Dialog from '@radix-ui/react-dialog';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import { NavItems } from './nav-items';

import css from './dashboard-shell.module.css';

async function handleSignOut() {
  await signOut();
}

function LogoutButton({ onClick }: { onClick?: () => void }) {
  return (
    <form action={handleSignOut}>
      <button type='submit' onClick={onClick} className={css.item}>
        Log out
      </button>
    </form>
  );
}

interface DashboardShellProps {
  children: React.ReactNode;
  userEmail: string;
  avatarUrl: string | null;
  isAdmin: boolean;
}

export function DashboardShell({ children, userEmail, avatarUrl, isAdmin }: DashboardShellProps) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const menuLogoutRef = useRef<HTMLFormElement>(null);

  return (
    <div className={css.shell}>
      <a className={cn(dashTheme, css.skip)} href='#main'>
        Skip to content
      </a>

      {/* Desktop Sidebar */}
      <aside aria-label='Sidebar' className={cn(dashTheme, css.rail)}>
        <div className={css.railInner}>
          <Link href='/' className={css.name}>
            Fundwell
          </Link>
          <nav aria-label='Main' className={css.nav}>
            <NavItems isAdmin={isAdmin} className={css.item} />
          </nav>
          <LogoutButton />
        </div>
      </aside>

      <div className={css.column}>
        <header className={cn(dashTheme, css.bar)}>
          {/* Mobile Menu */}
          <div className={css.small}>
            <Dialog.Root open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <Dialog.Trigger asChild>
                <IconButton label='Open menu'>
                  <Menu aria-hidden='true' width={18} height={18} strokeWidth={1.8} />
                </IconButton>
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Overlay className={css.shade} />
                <Dialog.Content className={cn(dashTheme, css.drawer)} aria-describedby={undefined}>
                  <Dialog.Title className={css.name}>Fundwell</Dialog.Title>
                  <nav aria-label='Menu' className={css.nav}>
                    <NavItems isAdmin={isAdmin} className={css.item} onClick={() => setMobileNavOpen(false)} />
                  </nav>
                  <LogoutButton onClick={() => setMobileNavOpen(false)} />
                  <Dialog.Close asChild>
                    <IconButton label='Close' className={css.close}>
                      <X aria-hidden='true' width={18} height={18} strokeWidth={1.8} />
                    </IconButton>
                  </Dialog.Close>
                </Dialog.Content>
              </Dialog.Portal>
            </Dialog.Root>
            <Link href='/dashboard' className={css.name}>
              Fundwell
            </Link>
          </div>

          {/* User Menu */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger className={css.who} aria-label={`${userEmail}, account menu`}>
              <span aria-hidden='true' className={css.avatar}>
                {avatarUrl ? <Image src={avatarUrl} alt='' fill sizes='32px' /> : userEmail.charAt(0)}
              </span>
              <span aria-hidden='true' className={css.email}>
                {userEmail}
              </span>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align='end' sideOffset={4} className={cn(dashTheme, css.menu)}>
                <DropdownMenu.Label className={css.menuEmail}>{userEmail}</DropdownMenu.Label>
                <DropdownMenu.Item asChild className={css.menuItem}>
                  <Link href='/dashboard'>Dashboard</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={css.menuItem}>
                  <Link href='/dashboard/account'>Account</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item asChild className={css.menuItem}>
                  <Link href='/dashboard/billing'>Billing</Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item className={css.menuItem} onSelect={() => menuLogoutRef.current?.requestSubmit()}>
                  Log out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
          {/* Outside the menu, so the menu closing doesn't take the form away before it is sent */}
          <form ref={menuLogoutRef} action={handleSignOut} hidden />
        </header>

        <main id='main' tabIndex={-1} className={css.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
