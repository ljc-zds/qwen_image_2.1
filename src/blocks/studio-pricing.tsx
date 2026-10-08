import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Layers, Menu, Sparkles, X } from 'lucide-react';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { apiGet, apiPost } from '@/lib/api-client';
import { m } from '@/paraglide/messages.js';
import { getLocale, setLocale } from '@/paraglide/runtime.js';
import { StudioAccount } from '@/blocks/studio-account';
import { StudioLogin } from '@/blocks/studio-login';
import { SupportContact } from '@/components/support-contact';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';

import '@/styles/studio.css';
import '@/styles/studio-pricing.css';

export function StudioPricing() {
  const yearly = false;
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selected, setSelected] = useState<'creator' | 'pro' | 'pack' | null>(
    null
  );
  const { data: session } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const paymentStatus = useQuery({
    queryKey: ['payment-status'],
    queryFn: () =>
      apiGet<{ ready: boolean; environment: string }>('/api/payment/status'),
  });
  const checkout = useMutation({
    mutationFn: (sku: string) =>
      apiPost<{ checkout_url: string }>('/api/payment/checkout', {
        product_id: sku,
        payment_provider: 'waffo',
      }),
  });
  const choose = (id: 'creator' | 'pro' | 'pack') => {
    checkout.reset();
    if (!session?.user) {
      setLoginOpen(true);
      return;
    }
    setSelected(id);
  };
  const navigation = [
    { href: '/image-generator', label: m['studio.nav.create']() },
    { href: '/transparent-png', label: m['studio.nav.png']() },
    { href: '/image-editor', label: m['studio.nav.edit']() },
    { href: '/prompts', label: m['studio.nav.prompts']() },
    { href: '/my-creations', label: m['gallery.title']() },
    { href: '/blog', label: m['blog.title']() },
    { href: '/pricing', label: m['studio.pricing.nav']() },
  ];
  const common = [
    m['studio.pricing.generation'](),
    m['studio.pricing.editing'](),
    m['studio.pricing.png'](),
    m['studio.pricing.ratios'](),
  ];
  const plans = [
    {
      id: 'free' as const,
      name: m['studio.pricing.free.name'](),
      copy: m['studio.pricing.free.copy'](),
      price: 0,
      annual: 0,
      credits: 1,
      features: [
        m['studio.pricing.library'](),
        m['studio.pricing.copy'](),
        m['studio.pricing.workspace'](),
      ],
    },
    {
      id: 'creator' as const,
      name: m['studio.pricing.creator.name'](),
      copy: m['studio.pricing.creator.copy'](),
      price: yearly ? 9 : 12,
      annual: 108,
      credits: 100,
      features: common,
    },
    {
      id: 'pro' as const,
      name: m['studio.pricing.pro.name'](),
      copy: m['studio.pricing.pro.copy'](),
      price: yearly ? 24 : 29,
      annual: 288,
      credits: 300,
      features: common,
    },
  ];
  const chosen =
    selected === 'pack'
      ? {
          id: 'pack',
          name: m['studio.payment.pack'](),
          price: 9.9,
          annual: 0,
          credits: 80,
        }
      : plans.find((plan) => plan.id === selected);
  const comparison = [
    { label: m['studio.pricing.library'](), free: true },
    { label: m['studio.pricing.copy'](), free: true },
    { label: m['studio.pricing.workspace'](), free: true },
    { label: m['studio.pricing.generation'](), free: false },
    { label: m['studio.pricing.editing'](), free: false },
    { label: m['studio.pricing.png'](), free: false },
  ];
  const faqs = [
    { q: m['studio.pricing.faq.pay.q'](), a: m['studio.pricing.faq.pay.a']() },
    {
      q: m['studio.pricing.faq.free.q'](),
      a: m['studio.pricing.faq.free.a'](),
    },
    {
      q: m['studio.pricing.faq.credit.q'](),
      a: m['studio.pricing.faq.credit.a'](),
    },
    {
      q: m['studio.pricing.faq.annual.q'](),
      a: m['studio.pricing.faq.annual.a'](),
    },
    {
      q: m['studio.pricing.faq.cancel.q'](),
      a: m['studio.pricing.faq.cancel.a'](),
    },
    {
      q: m['studio.pricing.faq.commercial.q'](),
      a: m['studio.pricing.faq.commercial.a'](),
    },
  ];
  return (
    <div className="prism-site pricing-page">
      <a className="prism-skip" href="#plans">
        {m['studio.skip']()}
      </a>
      <header className="prism-header">
        <Link className="prism-brand" href="/">
          <img src="/logo.svg" width={30} height={30} alt="" />
          <span>
            {envConfigs.app_name}
            <small>{m['studio.brand_tag']()}</small>
          </span>
        </Link>
        <nav
          className={mobileOpen ? 'prism-nav is-open' : 'prism-nav'}
          aria-label={m['studio.navigation']()}
        >
          {navigation.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={item.href === '/pricing' ? 'page' : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="prism-header-actions">
          <button
            className="language-button"
            onClick={() => setLocale(getLocale() === 'en' ? 'zh' : 'en')}
          >
            {getLocale() === 'en' ? '中文' : 'EN'}
          </button>
          <StudioAccount />
          <button
            className="mobile-menu"
            aria-expanded={mobileOpen}
            aria-label={m['studio.menu']()}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main>
        <section className="pricing-hero">
          <span className="pricing-eyebrow">
            <Sparkles size={14} />
            {m['studio.pricing.eyebrow']()}
          </span>
          <h1>{m['studio.pricing.heading']()}</h1>
          <p>{m['studio.pricing.subtitle']()}</p>
        </section>
        <section
          className="pricing-plans-section"
          id="plans"
          aria-label={m['studio.pricing.nav']()}
        >
          <div className="pricing-pack-offer">
            <div>
              <strong>{m['studio.payment.pack']()}</strong>
              <p>{m['studio.payment.pack_copy']()}</p>
            </div>
            <button
              className="pricing-plan-cta"
              type="button"
              onClick={() => choose('pack')}
            >
              {m['studio.payment.pack_cta']()} <ArrowRight size={15} />
            </button>
          </div>
          <div className="pricing-plan-grid">
            {plans.map((plan) => (
              <article
                className={
                  'pricing-plan' +
                  (plan.id === 'creator' ? ' is-recommended' : '')
                }
                key={plan.id}
              >
                {plan.id === 'creator' && (
                  <span className="pricing-recommended">
                    <Sparkles size={12} />
                    {m['studio.pricing.recommended']()}
                  </span>
                )}
                <span className="pricing-plan-icon">
                  {plan.id === 'creator' ? (
                    <Layers size={20} />
                  ) : (
                    <Sparkles size={20} />
                  )}
                </span>
                <h2>{plan.name}</h2>
                <p className="pricing-plan-copy">{plan.copy}</p>
                <div className="pricing-amount">
                  <span>$</span>
                  <strong>{plan.price}</strong>
                  <small>{m['studio.pricing.per_month']()}</small>
                </div>
                <p className="pricing-billing-note">
                  {plan.id === 'free'
                    ? m['studio.pricing.free_note']()
                    : yearly
                      ? m['studio.pricing.annual_total']({
                          amount: plan.annual,
                        })
                      : m['studio.pricing.monthly_note']()}
                </p>
                {plan.id === 'free' ? (
                  <Link className="pricing-plan-cta" href="/image-generator">
                    {m['studio.pricing.free.cta']()}
                    <ArrowRight size={15} />
                  </Link>
                ) : (
                  <button
                    className="pricing-plan-cta"
                    type="button"
                    onClick={() => choose(plan.id)}
                  >
                    {m['studio.pricing.paid.cta']()}
                    <ArrowRight size={15} />
                  </button>
                )}
                <div className="pricing-features">
                  {plan.credits > 0 && (
                    <p className="pricing-credit-allowance">
                      <Sparkles size={15} />
                      {plan.id === 'free'
                        ? m['studio.trial.welcome']()
                        : m['studio.pricing.credits']({ count: plan.credits })}
                    </p>
                  )}
                  {plan.features.map((feature) => (
                    <p key={feature}>
                      <Check size={15} />
                      {feature}
                    </p>
                  ))}
                </div>
                <p className="pricing-plan-footnote">
                  {plan.id === 'free'
                    ? m['studio.pricing.no_card']()
                    : m['studio.pricing.coming']()}
                </p>
              </article>
            ))}
          </div>
          <p className="pricing-no-payment">
            {m['studio.pricing.no_payment']()}
          </p>
          <p className="pricing-no-payment">
            <Link
              href="/terms-of-service#refunds"
              className="underline underline-offset-4"
            >
              {m['studio.refund.summary']()}
            </Link>
          </p>
        </section>
        <section className="pricing-comparison">
          <div className="pricing-section-heading">
            <span className="eyebrow">
              {m['studio.pricing.compare.eyebrow']()}
            </span>
            <h2>{m['studio.pricing.compare.title']()}</h2>
            <p>{m['studio.pricing.compare.copy']()}</p>
          </div>
          <div className="pricing-table-wrap">
            <table>
              <caption className="sr-only">
                {m['studio.pricing.compare.title']()}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{m['studio.pricing.compare.feature']()}</th>
                  {plans.map((plan) => (
                    <th key={plan.id} scope="col">
                      {plan.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <th scope="row">{m['studio.pricing.compare.credits']()}</th>
                  <td>—</td>
                  <td>100</td>
                  <td>300</td>
                </tr>
                {comparison.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {plans.map((plan) => (
                      <td key={plan.id}>
                        <span className="comparison-check">
                          <Check size={15} />
                          <span className="sr-only">
                            {m['studio.pricing.compare.available']()}
                          </span>
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section className="faq-section pricing-faq">
          <div className="pricing-section-heading">
            <span className="eyebrow">{m['studio.pricing.faq.eyebrow']()}</span>
            <h2>{m['studio.pricing.faq.title']()}</h2>
          </div>
          <div className="faq-list">
            {faqs.map((faq, index) => (
              <details key={faq.q} open={index === 0}>
                <summary>
                  {faq.q}
                  <span aria-hidden="true">+</span>
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="pricing-closing">
          <h2>{m['studio.pricing.closing.title']()}</h2>
          <p>{m['studio.pricing.closing.copy']()}</p>
          <Link href="/prompts">
            {m['studio.pricing.closing.cta']()}
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>
      <footer className="prism-footer">
        <div className="footer-top">
          <div>
            <Link className="prism-brand" href="/">
              <img src="/logo.svg" width={28} height={28} alt="" />
              <span>{envConfigs.app_name}</span>
            </Link>
            <p>{m['studio.footer_tagline']()}</p>
            <SupportContact />
          </div>
          <div className="footer-links">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href="/privacy-policy">{m['studio.privacy']()}</Link>
            <Link href="/terms-of-service">{m['studio.terms']()}</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} {envConfigs.app_name}.{' '}
            {m['studio.independent']()}
          </span>
        </div>
      </footer>
      <StudioLogin
        open={loginOpen}
        onOpenChange={setLoginOpen}
        beforeNavigate={async () => {}}
      />
      <Dialog
        open={!!chosen}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent className="pricing-plan-dialog" showCloseButton={false}>
          <DialogClose
            className="studio-login-close"
            aria-label={m['studio.auth.close']()}
          >
            ×
          </DialogClose>
          <span className="studio-login-icon">
            <Sparkles size={22} />
          </span>
          <DialogTitle>
            {m['studio.pricing.dialog.title']({ plan: chosen?.name ?? '' })}
          </DialogTitle>
          <DialogDescription>
            {paymentStatus.data?.ready
              ? m['studio.payment.checkout_copy']()
              : m['studio.payment.setup_needed']()}
          </DialogDescription>
          {chosen && (
            <div className="pricing-dialog-summary">
              <strong>
                ${chosen.price}
                <small>
                  {selected === 'pack'
                    ? m['studio.payment.once']()
                    : m['studio.pricing.per_month']()}
                </small>
              </strong>
              <p>
                {selected === 'pack'
                  ? m['studio.payment.pack_copy']()
                  : yearly
                    ? m['studio.pricing.annual_total']({
                        amount: chosen.annual,
                      })
                    : m['studio.pricing.monthly_note']()}
              </p>
              <span>
                {selected === 'pack'
                  ? m['studio.payment.pack_copy']()
                  : m['studio.pricing.credits']({ count: chosen.credits })}
              </span>
            </div>
          )}
          <button
            className="pricing-plan-cta"
            type="button"
            disabled={!paymentStatus.data?.ready || checkout.isPending}
            onClick={() =>
              checkout.data
                ? window.open(
                    checkout.data.checkout_url,
                    '_blank',
                    'noopener,noreferrer'
                  )
                : checkout.mutate(
                    selected === 'pack' ? 'image_pack' : selected + '_monthly'
                  )
            }
          >
            {checkout.isPending
              ? m['studio.payment.preparing']()
              : checkout.data
                ? m['studio.payment.open']()
                : m['studio.payment.prepare']()}
          </button>
          {checkout.isError && (
            <p role="alert">
              {checkout.error.message === 'waffo_subscription_exists'
                ? m['studio.payment.exists']()
                : m['studio.payment.failed']()}
            </p>
          )}
          {checkout.data && <p>{m['studio.payment.confirmed_by_webhook']()}</p>}
          <Link href="/settings/billing" className="pricing-dialog-link">
            {m['studio.pricing.dialog.back']()}
            <ArrowRight size={15} />
          </Link>
        </DialogContent>
      </Dialog>
    </div>
  );
}
