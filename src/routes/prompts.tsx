import { createFileRoute } from '@tanstack/react-router';

import { studioHead } from '@/lib/studio-seo';
import { StudioPage } from '@/blocks/studio-page';

export const Route = createFileRoute('/prompts')({
  head: () => studioHead('prompts', '/prompts'),
  component: () => <StudioPage page="prompts" />,
});
