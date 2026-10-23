import { createFileRoute } from '@tanstack/react-router';

import { studioHead } from '@/lib/studio-seo';
import { StudioPage } from '@/blocks/studio-page';

export const Route = createFileRoute('/')({
  head: () => studioHead('landing', '/'),
  component: () => <StudioPage page="home" homepage />,
});
