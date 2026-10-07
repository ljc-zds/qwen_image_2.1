import { createFileRoute } from '@tanstack/react-router';

import { studioHead } from '@/lib/studio-seo';
import { StudioPricing } from '@/blocks/studio-pricing';

export const Route = createFileRoute('/pricing')({
  head: () => studioHead('pricing', '/pricing'),
  component: StudioPricing,
});
