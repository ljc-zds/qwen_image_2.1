import { useEffect, useState } from 'react';
import { ArrowRight } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { m } from '@/paraglide/messages.js';
import { SiteUserMenu } from '@/components/site-user-menu';

import '@/styles/studio-auth.css';

export function StudioAccount({ onSignIn }: { onSignIn?: () => void }) {
  const { data: session, isPending } = useSession();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted || isPending)
    return (
      <span
        className="studio-account-loading"
        aria-label={m['studio.auth.loading']()}
      />
    );
  if (session?.user)
    return (
      <div className="studio-account">
        <SiteUserMenu
          name={session.user.name}
          email={session.user.email}
          image={session.user.image}
        />
      </div>
    );
  return onSignIn ? (
    <button type="button" className="studio-signin" onClick={onSignIn}>
      {m['studio.signin']()}
      <ArrowRight size={14} />
    </button>
  ) : (
    <Link className="studio-signin" href="/sign-in?callbackUrl=%2F">
      {m['studio.signin']()}
      <ArrowRight size={14} />
    </Link>
  );
}
