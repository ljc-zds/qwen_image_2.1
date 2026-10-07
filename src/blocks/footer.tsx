import { m } from '@/paraglide/messages.js';
import { SiteFooter } from '@/components/site-footer';

export function Footer() {
  return (
    <SiteFooter
      tagline={m['studio.footer_tagline']()}
      columns={[
        {
          title: m['studio.workspace'](),
          links: [
            { label: m['studio.nav.create'](), href: '/image-generator' },
            { label: m['studio.nav.png'](), href: '/transparent-png' },
            { label: m['studio.nav.edit'](), href: '/image-editor' },
            { label: m['studio.nav.prompts'](), href: '/prompts' },
          ],
        },
        {
          title: m['studio.faq'](),
          links: [
            { label: m['studio.privacy'](), href: '/privacy-policy' },
            { label: m['studio.terms'](), href: '/terms-of-service' },
          ],
        },
      ]}
    />
  );
}
