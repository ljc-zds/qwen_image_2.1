'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Coins, LogOutIcon, SettingsIcon, ShieldIcon } from 'lucide-react';

import { signOut } from '@/core/auth/client';
import { Link, useRouter } from '@/core/i18n/navigation';
import { apiGet } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function SiteUserMenu({
  name,
  email,
  image,
}: {
  name: string;
  email: string;
  image?: string | null;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const credits = useQuery({
    queryKey: ['user-credits', email],
    queryFn: () => apiGet<{ balance: number }>('/api/credits?summary=1'),
    staleTime: 30000,
    refetchInterval: 60000,
    retry: 1,
  });
  const balance = credits.isError
    ? '—'
    : (credits.data?.balance?.toLocaleString() ?? '…');
  const { data } = useUserPermissions();
  const isAdmin = data?.isAdmin === true;

  async function handleSignOut() {
    await signOut();
    queryClient.removeQueries({ queryKey: ['user-credits'] });
    queryClient.removeQueries({ queryKey: ['user-permissions'] });
    router.push('/');
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <Link
        href="/settings/credits"
        className="border-primary/20 bg-primary/5 text-primary flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap"
        aria-label={`${m['studio.account.credits']()}: ${balance}`}
        title={
          credits.isError
            ? m['studio.account.unavailable']()
            : m['studio.account.details']()
        }
      >
        <Coins className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">
          {m['studio.account.credits']()}
        </span>
        <span className="tabular-nums" aria-live="polite">
          {balance}
        </span>
      </Link>
      <Link
        href="/settings"
        className="hidden min-h-9 items-center text-sm font-medium lg:inline-flex"
      >
        {m['studio.account.center']()}
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={m['studio.account.menu']()}
          className="focus-visible:ring-ring rounded-full outline-none focus-visible:ring-2"
        >
          <Avatar className="size-9">
            <AvatarImage src={image || undefined} alt={name} />
            <AvatarFallback className="text-xs">
              {name.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" align="end" sideOffset={8}>
          <DropdownMenuGroup>
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8">
                  <AvatarImage src={image || undefined} alt={name} />
                  <AvatarFallback className="text-xs">
                    {name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{name}</span>
                  <span className="text-muted-foreground truncate text-xs">
                    {email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuItem render={<Link href="/settings" />}>
            <SettingsIcon className="size-4" />
            {m['studio.account.center']()}
          </DropdownMenuItem>
          <DropdownMenuItem render={<Link href="/settings/credits" />}>
            <Coins className="size-4" />
            {m['studio.account.credits']()} · {balance}
          </DropdownMenuItem>
          {isAdmin && (
            <DropdownMenuItem render={<Link href="/admin" />}>
              <ShieldIcon className="size-4" />
              {m['common.systems.admin']()}
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOutIcon className="size-4" />
            {m['common.sign.sign_out_title']()}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
