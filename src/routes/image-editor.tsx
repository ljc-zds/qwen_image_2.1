import { createFileRoute } from '@tanstack/react-router';

import { studioHead } from '@/lib/studio-seo';
import { StudioPage } from '@/blocks/studio-page';

export const Route = createFileRoute('/image-editor')({
  head: () => studioHead('editor', '/image-editor'),
  component: () => <StudioPage page="editor" />,
});
