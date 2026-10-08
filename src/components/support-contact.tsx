import { Mail } from 'lucide-react';

import { supportEmail } from '@/config/support';
import { m } from '@/paraglide/messages.js';

export function SupportContact() {
  return (
    <div className="mt-4 flex flex-col items-start gap-1 text-sm">
      <span>{m['studio.support.label']()}</span>
      <a
        href={`mailto:${supportEmail}`}
        className="inline-flex max-w-full items-center gap-2 break-all underline underline-offset-4"
      >
        <Mail size={15} className="shrink-0" aria-hidden="true" />
        {supportEmail}
      </a>
      <span className="text-xs opacity-75">
        {m['studio.support.response']()}
      </span>
    </div>
  );
}
