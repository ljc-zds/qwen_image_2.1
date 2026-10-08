import { createFileRoute, redirect } from '@tanstack/react-router';

import { getLocale } from '@/paraglide/runtime.js';

export const Route = createFileRoute('/settings/gallery')({
  beforeLoad: () => {
    throw redirect({
      href: getLocale() === 'zh' ? '/zh/my-creations' : '/my-creations',
    });
  },
});
