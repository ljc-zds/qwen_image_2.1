import { m } from '@/paraglide/messages.js';
import { SiteHeader } from '@/components/site-header';

export function Header() {
  return (
    <SiteHeader
      navLinks={[
        { href: '/image-generator', label: m['studio.nav.create']() },
        { href: '/transparent-png', label: m['studio.nav.png']() },
        { href: '/image-editor', label: m['studio.nav.edit']() },
        { href: '/prompts', label: m['studio.nav.prompts']() },
      ]}
    />
  );
}
