import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { LoaderCircle, Mail, Sparkles } from 'lucide-react';
import { z } from 'zod';

import { authClient, signIn } from '@/core/auth/client';
import { currentPathWithQuery } from '@/lib/redirect';
import { m } from '@/paraglide/messages.js';
import { localizeHref } from '@/paraglide/runtime.js';
import { usePublicConfig } from '@/hooks/use-public-config';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

import '@/styles/studio-auth.css';

export function StudioLogin({
  open,
  onOpenChange,
  beforeNavigate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beforeNavigate: () => Promise<void>;
}) {
  const config = usePublicConfig();
  const [error, setError] = useState('');
  const [socialPending, setSocialPending] = useState(false);
  const configs = config.data ?? {};
  const emailEnabled = configs.email_auth_enabled !== 'false';
  const googleEnabled = configs.google_auth_enabled === 'true';
  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: {
      onSubmit: z.object({
        email: z.string().email(),
        password: z.string().min(1),
      }),
    },
    onSubmit: async ({ value }) => {
      setError('');
      try {
        const result = await signIn.email({
          email: value.email.trim(),
          password: value.password,
        });
        if (result.error) {
          if (result.error.code === 'EMAIL_NOT_VERIFIED') {
            const callback = currentPathWithQuery();
            await beforeNavigate();
            await authClient.sendVerificationEmail({
              email: value.email.trim(),
              callbackURL: localizeHref(callback),
            });
            window.location.assign(
              localizeHref(
                '/verify-email?sent=1&email=' +
                  encodeURIComponent(value.email.trim()) +
                  '&callbackUrl=' +
                  encodeURIComponent(callback)
              )
            );
            return;
          }
          setError(m['studio.auth.failed']());
          return;
        }
        form.reset();
        onOpenChange(false);
      } catch {
        setError(m['studio.auth.failed']());
      }
    },
  });

  async function navigate(path: string) {
    setError('');
    try {
      await beforeNavigate();
      window.location.assign(
        localizeHref(
          path + '?callbackUrl=' + encodeURIComponent(currentPathWithQuery())
        )
      );
    } catch {
      setError(m['studio.auth.draft_failed']());
    }
  }

  async function google() {
    setError('');
    setSocialPending(true);
    try {
      await beforeNavigate();
      const result = await signIn.social({
        provider: 'google',
        callbackURL: localizeHref(currentPathWithQuery()),
      });
      if (result.error) {
        setError(m['studio.auth.failed']());
        setSocialPending(false);
      }
    } catch {
      setError(m['studio.auth.failed']());
      setSocialPending(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        setError('');
      }}
    >
      <DialogContent className="studio-login-dialog" showCloseButton={false}>
        <DialogClose
          className="studio-login-close"
          aria-label={m['studio.auth.close']()}
        >
          ×
        </DialogClose>
        <span className="studio-login-icon">
          <Sparkles size={23} />
        </span>
        <DialogTitle className="studio-login-title">
          {m['studio.auth.title']()}
        </DialogTitle>
        <DialogDescription className="studio-login-description">
          {m['studio.auth.description']()}
        </DialogDescription>
        {error && (
          <p className="studio-login-error" role="alert">
            {error}
          </p>
        )}
        {config.isPending ? (
          <p className="studio-login-loading">{m['studio.auth.loading']()}</p>
        ) : config.isError ? (
          <p role="alert">{m['studio.auth.failed']()}</p>
        ) : (
          <>
            {googleEnabled && (
              <button
                type="button"
                className="studio-google-button"
                disabled={socialPending}
                onClick={() => void google()}
              >
                {socialPending ? (
                  <LoaderCircle size={17} className="spin" />
                ) : (
                  <span aria-hidden="true">G</span>
                )}
                {m['common.sign.google_sign_in']()}
              </button>
            )}
            {googleEnabled && emailEnabled && (
              <div className="studio-login-divider">
                {m['common.sign.or']()}
              </div>
            )}
            {emailEnabled && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void form.handleSubmit();
                }}
              >
                <form.Field name="email">
                  {(field) => (
                    <label className="studio-login-field">
                      {m['common.sign.email_title']()}
                      <input
                        type="email"
                        autoComplete="email"
                        name="email"
                        required
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        onBlur={field.handleBlur}
                        placeholder="you@example.com"
                      />
                    </label>
                  )}
                </form.Field>
                <form.Field name="password">
                  {(field) => (
                    <label className="studio-login-field">
                      {m['common.sign.password_title']()}
                      <input
                        type="password"
                        autoComplete="current-password"
                        name="password"
                        required
                        value={field.state.value}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        onBlur={field.handleBlur}
                      />
                    </label>
                  )}
                </form.Field>
                {configs.password_reset_enabled === 'true' && (
                  <button
                    type="button"
                    className="studio-login-forgot"
                    onClick={() => void navigate('/forgot-password')}
                  >
                    {m['studio.auth.forgot']()}
                  </button>
                )}
                <form.Subscribe selector={(state) => state.isSubmitting}>
                  {(pending) => (
                    <button
                      type="submit"
                      className="studio-login-submit"
                      disabled={pending || socialPending}
                    >
                      {pending ? (
                        <LoaderCircle size={16} className="spin" />
                      ) : (
                        <Mail size={16} />
                      )}
                      {m['studio.auth.email_signin']()}
                    </button>
                  )}
                </form.Subscribe>
                <p className="studio-login-register">
                  {m['studio.auth.new_user']()}{' '}
                  <button
                    type="button"
                    onClick={() => void navigate('/sign-up')}
                  >
                    {m['studio.auth.create_account']()}
                  </button>
                </p>
              </form>
            )}
            {!emailEnabled && !googleEnabled && (
              <p>{m['common.sign.no_methods_description']()}</p>
            )}
          </>
        )}
        <p className="studio-login-footnote">{m['studio.auth.keep_draft']()}</p>
      </DialogContent>
    </Dialog>
  );
}
