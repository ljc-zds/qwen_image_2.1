import { createFileRoute } from '@tanstack/react-router';

import { studioHead } from '@/lib/studio-seo';
import { HomeLanding } from '@/blocks/home-landing';

export const Route = createFileRoute('/')({
  head: () => studioHead('landing', '/'),
  component: HomeLanding,
});
