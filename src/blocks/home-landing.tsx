import { useState } from 'react';
import {
  ArrowRight,
  ImagePlus,
  Layers,
  Menu,
  Palette,
  PenTool,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';

import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { studioFaqs } from '@/lib/studio-content';
import { m } from '@/paraglide/messages.js';
import { getLocale, setLocale } from '@/paraglide/runtime.js';
import { StudioAccount } from '@/blocks/studio-account';
import { SupportContact } from '@/components/support-contact';

import '@/styles/studio.css';
import '@/styles/home.css';

export function HomeLanding() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const tools = [
    {
      href: '/image-generator',
      icon: Sparkles,
      title: m['studio.nav.create'](),
      copy: m['studio.home.tool.generate'](),
    },
    {
      href: '/image-editor',
      icon: ImagePlus,
      title: m['studio.nav.edit'](),
      copy: m['studio.home.tool.edit'](),
    },
    {
      href: '/transparent-png',
      icon: Layers,
      title: m['studio.nav.png'](),
      copy: m['studio.home.tool.transparent'](),
    },
    {
      href: '/prompts',
      icon: WandSparkles,
      title: m['studio.nav.prompts'](),
      copy: m['studio.home.tool.prompts'](),
    },
  ];
  const features = [
    {
      href: '/image-generator',
      title: m['studio.home.feature.generate.title'](),
      copy: m['studio.home.feature.generate.copy'](),
      cta: m['studio.home.feature.generate.cta'](),
      image: '/imgs/original/space-cat-koi.webp',
      alt: m['studio.carousel.product_alt'](),
      visual: 'visual-generate',
      note: m['studio.home.visual.original'](),
      prompt: m['studio.prompt.product'](),
    },
    {
      href: '/image-editor',
      title: m['studio.home.feature.edit.title'](),
      copy: m['studio.home.feature.edit.copy'](),
      cta: m['studio.home.feature.edit.cta'](),
      image: '/imgs/original/perfume-product.webp',
      alt: m['studio.sample_alt'](),
      visual: 'visual-edit',
      note: m['studio.home.visual.edit'](),
      prompt: m['studio.prompt.edit'](),
    },
    {
      href: '/transparent-png',
      title: m['studio.home.feature.transparent.title'](),
      copy: m['studio.home.feature.transparent.copy'](),
      cta: m['studio.home.feature.transparent.cta'](),
      image: '/imgs/original/astronaut-otter-sticker.webp',
      alt: m['studio.carousel.sticker_alt'](),
      visual: 'visual-transparent',
      note: m['studio.home.visual.transparent'](),
      prompt: m['studio.prompt.sticker'](),
    },
    {
      href: '/prompts',
      title: m['studio.home.feature.prompts.title'](),
      copy: m['studio.home.feature.prompts.copy'](),
      cta: m['studio.home.feature.prompts.cta'](),
      image: '/imgs/original/ramen-miniature-city.webp',
      alt: m['studio.carousel.editorial_alt'](),
      visual: 'visual-prompts',
      note: m['studio.home.visual.prompts'](),
      prompt: m['studio.prompt.editorial'](),
    },
  ];
  return (
    <div className="prism-site home-page">
      <a className="prism-skip" href="#tools">
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
          <Link href="/" aria-current="page">
            {m['studio.home']()}
          </Link>
          <Link href="#tools" onClick={() => setMobileOpen(false)}>
            {m['studio.home.nav.tools']()}
          </Link>
          <Link href="/prompts">{m['studio.nav.prompts']()}</Link>
          <Link href="/pricing">{m['studio.pricing.nav']()}</Link>
          <Link href="/my-creations">{m['gallery.title']()}</Link>
          <Link href="/blog">{m['blog.title']()}</Link>
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
            aria-label={m['studio.menu']()}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>
      <main>
        <section className="home-hero">
          <h1>
            {m['studio.home.hero.lead']()}
            <br />
            <span>Qwen Image 2.1</span>
          </h1>
          <p className="home-subtitle">{m['studio.home.hero.subtitle']()}</p>
          <div className="home-actions">
            <Link className="home-primary" href="/image-generator">
              {m['studio.home.hero.primary']()}
              <ArrowRight size={17} />
            </Link>
            <Link className="home-secondary" href="/prompts">
              {m['studio.home.hero.secondary']()}
            </Link>
          </div>
          <div className="home-tool-grid">
            {tools.map((tool) => (
              <Link className="home-tool-card" href={tool.href} key={tool.href}>
                <span className="tool-icon">
                  <tool.icon size={29} />
                </span>
                <h2>{tool.title}</h2>
                <p>{tool.copy}</p>
              </Link>
            ))}
          </div>
          <div className="home-related">
            <span>{m['studio.home.hero.related']()}</span>
            <Link href="/prompts">{m['studio.home.hero.learn']()}</Link>
            <Link href="#faq">{m['studio.home.hero.faq']()}</Link>
          </div>
          <p className="home-status">{m['studio.home.hero.status']()}</p>
        </section>
        <section className="home-section home-tools" id="tools">
          <div className="home-section-heading">
            <h2>{m['studio.home.tools.title']()}</h2>
            <p>{m['studio.home.tools.subtitle']()}</p>
          </div>
          <div className="home-feature-list">
            {features.map((feature) => (
              <article className="home-feature" key={feature.href}>
                <div className={'feature-visual ' + feature.visual}>
                  <img
                    src={feature.image}
                    alt={feature.alt}
                    width={1024}
                    height={1024}
                    loading="lazy"
                  />
                  <span className="visual-symbol" aria-hidden="true">
                    <ArrowRight size={32} />
                  </span>
                  <div className="visual-note">
                    <strong>{feature.note}</strong>
                    <p>{feature.prompt}</p>
                  </div>
                </div>
                <div className="feature-copy">
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                  <Link className="home-primary" href={feature.href}>
                    {feature.cta}
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
        <section className="home-section home-usecases">
          <div className="home-section-heading">
            <h2>{m['studio.home.usecases.title']()}</h2>
            <p>{m['studio.home.usecases.subtitle']()}</p>
          </div>
          <div className="home-usecase-grid">
            {[
              {
                icon: Sparkles,
                title: m['studio.home.usecase.one.title'](),
                copy: m['studio.home.usecase.one.copy'](),
              },
              {
                icon: Palette,
                title: m['studio.home.usecase.two.title'](),
                copy: m['studio.home.usecase.two.copy'](),
              },
              {
                icon: PenTool,
                title: m['studio.home.usecase.three.title'](),
                copy: m['studio.home.usecase.three.copy'](),
              },
            ].map((item) => (
              <article className="home-usecase" key={item.title}>
                <item.icon size={25} />
                <h3>{item.title}</h3>
                <p>{item.copy}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="faq-section home-faq" id="faq">
          <div>
            <span className="eyebrow">{m['studio.faq']()}</span>
            <h2>{m['studio.faq_title']()}</h2>
            <p>{m['studio.faq_subtitle']()}</p>
          </div>
          <div className="faq-list">
            {studioFaqs('home').map((faq, index) => (
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
        <section className="home-closing">
          <h2>{m['studio.home.closing.title']()}</h2>
          <p>{m['studio.home.closing.copy']()}</p>
          <Link className="home-primary" href="/image-generator">
            {m['studio.home.hero.primary']()}
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
            {tools.map((tool) => (
              <Link key={tool.href} href={tool.href}>
                {tool.title}
              </Link>
            ))}
            <Link href="/pricing">{m['studio.pricing.nav']()}</Link>
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
    </div>
  );
}
