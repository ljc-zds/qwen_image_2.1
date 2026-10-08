import { createFileRoute, Outlet } from '@tanstack/react-router';
import {
  ChartColumn,
  CreditCard,
  FolderOpen,
  Home,
  LayoutDashboard,
  Settings,
  Shield,
} from 'lucide-react';

import { usePathname } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { m } from '@/paraglide/messages.js';
import { useUserPermissions } from '@/hooks/use-user-permissions';
import { AppLayout } from '@/components/app-layout';

export const Route = createFileRoute('/admin')({
  component: AdminLayout,
});

function AdminLayout() {
  const pathname = usePathname();
  const { data: permissions } = useUserPermissions();
  const trafficOnly = permissions?.isAdmin !== true;
  const group = m['common.systems.admin']();
  const navItems = [
    {
      href: '/admin/analytics',
      label: m['admin.analytics.title'](),
      icon: ChartColumn,
      group,
    },
    {
      href: '/admin',
      label: m['admin.nav.overview'](),
      icon: LayoutDashboard,
      group,
    },
    {
      href: '/admin/users',
      label: m['admin.nav.rbac'](),
      icon: Shield,
      group,
      items: [
        { href: '/admin/users', label: m['admin.nav.users']() },
        { href: '/admin/invite-codes', label: m['admin.nav.invite_codes']() },
        { href: '/admin/roles', label: m['admin.nav.roles']() },
        { href: '/admin/permissions', label: m['admin.nav.permissions']() },
      ],
    },
    {
      href: '/admin/payments',
      label: m['admin.nav.billing'](),
      icon: CreditCard,
      group,
      items: [
        { href: '/admin/payments', label: m['admin.nav.payments']() },
        { href: '/admin/subscriptions', label: m['admin.nav.subscriptions']() },
        { href: '/admin/credits', label: m['admin.nav.credits']() },
      ],
    },
    {
      href: '/admin/categories',
      label: m['admin.nav.content'](),
      icon: FolderOpen,
      group,
      items: [
        { href: '/admin/categories', label: m['admin.nav.categories']() },
        { href: '/admin/posts', label: m['admin.nav.posts']() },
        { href: '/admin/tickets', label: m['admin.nav.tickets']() },
      ],
    },
  ];

  const footerNavItems = [
    {
      href: '/admin/settings',
      label: m['admin.nav.settings'](),
      icon: Settings,
    },
    { href: '/', label: m['common.systems.home'](), icon: Home, newTab: true },
  ];

  return (
    <AppLayout
      navItems={
        trafficOnly
          ? navItems.filter((item) => item.href === '/admin/analytics')
          : navItems
      }
      footerNavItems={
        trafficOnly
          ? footerNavItems.filter((item) => item.href === '/')
          : footerNavItems
      }
      brand={envConfigs.app_name}
      brandHref={trafficOnly ? '/admin/analytics' : '/admin'}
      profileHref="/settings/profile"
      requirePermission={
        pathname === '/admin/analytics' ? 'admin.analytics.read' : 'admin.*'
      }
    >
      <Outlet />
    </AppLayout>
  );
}
