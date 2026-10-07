import { createFileRoute } from '@tanstack/react-router';

import { studioHead } from '@/lib/studio-seo';
import { StudioPage } from '@/blocks/studio-page';

export const Route = createFileRoute('/image-generator')({
  head: () => studioHead('home', '/image-generator'),
  component: () => <StudioPage page="home" />,
});
