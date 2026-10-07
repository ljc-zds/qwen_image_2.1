import { createFileRoute } from '@tanstack/react-router';

import { studioDiscovery } from '@/lib/studio-discovery';

export const Route = createFileRoute('/llms.txt')({
  server: { handlers: { GET: () => studioDiscovery(false) } },
});
