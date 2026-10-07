import { createFileRoute } from '@tanstack/react-router';

import { studioHead } from '@/lib/studio-seo';
import { StudioPage } from '@/blocks/studio-page';

export const Route = createFileRoute('/transparent-png')({
  head: () => studioHead('transparent', '/transparent-png'),
  component: () => <StudioPage page="transparent" />,
});
