import { useEffect, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import {
  ArrowDown,
  ArrowRight,
  Check,
  Download,
  ImagePlus,
  Layers,
  LoaderCircle,
  Menu,
  Plus,
  Sparkles,
  WandSparkles,
  X,
} from 'lucide-react';
import { z } from 'zod';

import { useSession } from '@/core/auth/client';
import { Link } from '@/core/i18n/navigation';
import { envConfigs } from '@/config';
import { apiGet, apiPost } from '@/lib/api-client';
import { currentPathWithQuery } from '@/lib/redirect';
import { studioFaqs, studioHowToTitle } from '@/lib/studio-content';
import { saveStudioDraft, takeStudioDraft } from '@/lib/studio-draft';
import type { StudioPageKind } from '@/lib/studio-seo';
import { m } from '@/paraglide/messages.js';
import { getLocale, setLocale } from '@/paraglide/runtime.js';
import { PromptLibrary } from '@/blocks/prompt-library';
import { promptExamples } from '@/blocks/prompt-library-catalog';
import { StudioAccount } from '@/blocks/studio-account';
import { StudioLogin } from '@/blocks/studio-login';
import { PreviewCarousel } from '@/components/preview-carousel';
import { SupportContact } from '@/components/support-contact';

import '@/styles/studio.css';
import '@/styles/workspace.css';

type Mode = 'generate' | 'edit' | 'transparent';
type Result = { url: string; transparent: boolean };
const promptSchema = z.object({ prompt: z.string().trim().min(5).max(2000) });

export function StudioPage({ page }: { page: StudioPageKind }) {
  const location = useLocation();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<Mode>(
    page === 'transparent'
      ? 'transparent'
      : page === 'editor'
        ? 'edit'
        : 'generate'
  );
  const { data: session, isPending: sessionPending } = useSession();
  const [loginOpen, setLoginOpen] = useState(false);
  const [ratio, setRatio] = useState('1:1');
  const [reference, setReference] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [feedback, setFeedback] = useState('');
  const [mobileOpen, setMobileOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const status = useQuery({
    queryKey: ['studio-status'],
    queryFn: () => apiGet<{ ready: boolean }>('/api/studio/generate'),
    retry: false,
  });
  const generation = useMutation({
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ['user-credits'] }),
    mutationFn: (prompt: string) =>
      apiPost<Result>('/api/studio/generate', {
        prompt,
        mode,
        ratio,
        images: reference ? [reference] : [],
      }),
    onSuccess: (data) => {
      setResult(data);
      setFeedback('');
    },
    onError: (error: Error) => {
      if (error.message === 'unauthorized') setLoginOpen(true);
      setFeedback(
        error.message === 'insufficient_credits'
          ? m['studio.payment.insufficient']()
          : error.message === 'not_configured'
            ? m['studio.unavailable']()
            : error.message === 'unauthorized'
              ? m['studio.signin_required']()
              : m['studio.failed']()
      );
    },
  });
  const form = useForm({
    defaultValues: { prompt: '' },
    validators: { onSubmit: promptSchema },
    onSubmit: async ({ value }) => {
      setFeedback('');
      if (!session?.user) {
        setLoginOpen(true);
        return;
      }
      if (mode === 'edit' && !reference) {
        setFeedback(m['studio.upload_required']());
        return;
      }
      await generation.mutateAsync(value.prompt).catch(() => undefined);
    },
  });
  useEffect(() => {
    setMode(
      page === 'transparent'
        ? 'transparent'
        : page === 'editor'
          ? 'edit'
          : 'generate'
    );
    setResult(null);
    setFeedback('');
  }, [page]);

  useEffect(() => {
    let active = true;
    void takeStudioDraft(currentPathWithQuery())
      .catch(() => null)
      .then((draft) => {
        if (!active) return;
        if (draft) {
          form.setFieldValue('prompt', draft.prompt);
          setMode(draft.mode);
          setRatio(draft.ratio);
          setReference(draft.reference);
          return;
        }
        const id = new URLSearchParams(window.location.search).get('example');
        const example = promptExamples().find((item) => item.id === id);
        if (example) {
          form.setFieldValue('prompt', example.prompt);
          setMode(example.mode);
          setReference(null);
          setFeedback('');
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [page, location.searchStr]);

  async function preserveDraft() {
    await saveStudioDraft(currentPathWithQuery(), {
      prompt: form.state.values.prompt,
      mode,
      ratio,
      reference,
    });
  }

  async function upload(file?: File) {
    if (!file) return;
    if (
      !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      setFeedback(m['studio.upload_error']());
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setReference(String(reader.result));
      setFeedback('');
    };
    reader.onerror = () => setFeedback(m['studio.upload_error']());
    reader.readAsDataURL(file);
  }
  function usePrompt(prompt: string, target: Mode = 'generate') {
    form.setFieldValue('prompt', prompt);
    setMode(target);
    setFeedback('');
    document
      .getElementById('workspace')
      ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  const examples = [
    {
      label: m['studio.example.product'](),
      prompt: m['studio.prompt.product'](),
      mode: 'generate' as Mode,
      className: 'sample-product',
      image: '/imgs/original/space-cat-koi.webp',
      alt: m['studio.carousel.product_alt'](),
    },
    {
      label: m['studio.example.sticker'](),
      prompt: m['studio.prompt.sticker'](),
      mode: 'transparent' as Mode,
      className: 'sample-sticker',
      image: '/imgs/original/astronaut-otter-sticker.webp',
      alt: m['studio.carousel.sticker_alt'](),
    },
    {
      label: m['studio.example.editorial'](),
      prompt: m['studio.prompt.editorial'](),
      mode: 'generate' as Mode,
      className: 'sample-editorial',
      image: '/imgs/original/ramen-miniature-city.webp',
      alt: m['studio.carousel.editorial_alt'](),
    },
  ];
  const heading =
    page === 'transparent'
      ? m['studio.title.transparent']()
      : page === 'editor'
        ? m['studio.title.editor']()
        : page === 'prompts'
          ? m['studio.title.prompts']()
          : m['studio.title.home']();
  const subtitle =
    page === 'transparent'
      ? m['studio.subtitle.transparent']()
      : page === 'editor'
        ? m['studio.subtitle.editor']()
        : page === 'prompts'
          ? m['studio.subtitle.prompts']()
          : m['studio.subtitle.home']();
  return (
    <div className="prism-site tool-page">
      <a className="prism-skip" href="#workspace">
        {m['studio.skip']()}
      </a>
      <header className="prism-header">
        <Link className="prism-brand" href="/">
          <img src="/logo.svg" width="30" height="30" alt="" />
          <span>
            {envConfigs.app_name}
            <small>{m['studio.brand_tag']()}</small>
          </span>
        </Link>
        <nav
          className={mobileOpen ? 'prism-nav is-open' : 'prism-nav'}
          aria-label={m['studio.navigation']()}
        >
          <Link
            href="/image-generator"
            aria-current={page === 'home' ? 'page' : undefined}
          >
            {m['studio.nav.create']()}
          </Link>
          <Link
            href="/transparent-png"
            aria-current={page === 'transparent' ? 'page' : undefined}
          >
            {m['studio.nav.png']()}
            <span className="nav-new">{m['studio.new']()}</span>
          </Link>
          <Link
            href="/image-editor"
            aria-current={page === 'editor' ? 'page' : undefined}
          >
            {m['studio.nav.edit']()}
          </Link>
          <Link
            href="/prompts"
            aria-current={page === 'prompts' ? 'page' : undefined}
          >
            {m['studio.nav.prompts']()}
          </Link>
          <Link href="/pricing">{m['studio.pricing.nav']()}</Link>
        </nav>
        <div className="prism-header-actions">
          <button
            className="language-button"
            onClick={() => setLocale(getLocale() === 'en' ? 'zh' : 'en')}
          >
            {getLocale() === 'en' ? '中文' : 'EN'}
          </button>
          <StudioAccount onSignIn={() => setLoginOpen(true)} />
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
      <StudioLogin
        open={loginOpen}
        onOpenChange={setLoginOpen}
        beforeNavigate={preserveDraft}
      />
      <main>
        <nav className="prism-breadcrumb" aria-label={m['studio.breadcrumb']()}>
          <Link href="/">{m['studio.home']()}</Link>
          <span>›</span>
          <span>{m['studio.workspace']()}</span>
          <span>›</span>
          <strong>
            {page === 'transparent'
              ? m['studio.nav.png']()
              : page === 'editor'
                ? m['studio.nav.edit']()
                : page === 'prompts'
                  ? m['studio.nav.prompts']()
                  : m['studio.nav.create']()}
          </strong>
        </nav>
        <section className="prism-hero">
          <h1>{heading}</h1>
          <p>{subtitle}</p>
          <div className="hero-benefits">
            <span>
              <Check size={13} />
              {m['studio.benefit.one']()}
            </span>
            <span>
              <Check size={13} />
              {m['studio.benefit.two']()}
            </span>
            <span>
              <Check size={13} />
              {m['studio.benefit.three']()}
            </span>
          </div>
        </section>
        {page === 'prompts' && <PromptLibrary onUse={usePrompt} />}
        <section
          id="workspace"
          className="prism-workspace"
          aria-label={m['studio.workspace']()}
        >
          <div
            className="mode-tabs"
            role="tablist"
            aria-label={m['studio.mode']()}
          >
            {(
              [
                {
                  key: 'generate',
                  label: m['studio.mode.generate'](),
                  icon: Sparkles,
                },
                {
                  key: 'edit',
                  label: m['studio.mode.edit'](),
                  icon: ImagePlus,
                },
                {
                  key: 'transparent',
                  label: m['studio.mode.transparent'](),
                  icon: Layers,
                },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                tabIndex={mode === tab.key ? 0 : -1}
                onKeyDown={(e) => {
                  if (
                    !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)
                  )
                    return;
                  e.preventDefault();
                  const modes: Mode[] = ['generate', 'edit', 'transparent'];
                  const next =
                    e.key === 'Home'
                      ? 0
                      : e.key === 'End'
                        ? 2
                        : (modes.indexOf(mode) +
                            (e.key === 'ArrowRight' ? 1 : 2)) %
                          3;
                  setMode(modes[next]);
                  document.getElementById('tab-' + modes[next])?.focus();
                }}
                aria-selected={mode === tab.key}
                aria-controls="creation-form"
                id={'tab-' + tab.key}
                onClick={() => {
                  setMode(tab.key);
                  setFeedback('');
                }}
                className={mode === tab.key ? 'active' : ''}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
          <div className="workspace-toolbar">
            <div>
              <span className="workspace-dot" />
              {m['studio.workspace']()}
            </div>
            <span className="model-pill">
              <Layers size={13} />
              Qwen Image 2.1
            </span>
          </div>
          <div className="workspace-grid">
            <div className="creation-panel">
              <form
                id="creation-form"
                role="tabpanel"
                aria-labelledby={'tab-' + mode}
                onSubmit={(e) => {
                  e.preventDefault();
                  void form.handleSubmit();
                }}
              >
                {(mode === 'edit' || reference) && (
                  <div className="reference-wrap">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={(e) => {
                        void upload(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                      hidden
                    />
                    {reference ? (
                      <div className="reference-preview">
                        <img src={reference} alt={m['studio.reference']()} />
                        <span>{m['studio.reference']()}</span>
                        <button
                          type="button"
                          aria-label={m['studio.remove']()}
                          onClick={() => setReference(null)}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <button
                        className="upload-zone"
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          void upload(e.dataTransfer.files[0]);
                        }}
                      >
                        <ImagePlus size={22} />
                        <strong>{m['studio.upload']()}</strong>
                        <small>{m['studio.upload_hint']()}</small>
                      </button>
                    )}
                  </div>
                )}
                <form.Field name="prompt">
                  {(field) => (
                    <div className="prompt-field">
                      <label htmlFor="prompt">
                        {mode === 'edit'
                          ? m['studio.prompt.edit_label']()
                          : m['studio.prompt.label']()}
                        <span>{m['studio.prompt.tip']()}</span>
                      </label>
                      <textarea
                        id="prompt"
                        value={field.state.value}
                        onChange={(e) => field.handleChange(e.target.value)}
                        onBlur={field.handleBlur}
                        placeholder={
                          mode === 'transparent'
                            ? m['studio.placeholder.png']()
                            : mode === 'edit'
                              ? m['studio.placeholder.edit']()
                              : m['studio.placeholder.generate']()
                        }
                        maxLength={2000}
                        aria-invalid={field.state.meta.errors.length > 0}
                        aria-describedby="prompt-help"
                      />
                      <div className="prompt-bottom">
                        <button
                          type="button"
                          onClick={() =>
                            usePrompt(
                              mode === 'transparent'
                                ? m['studio.prompt.sticker']()
                                : mode === 'edit'
                                  ? m['studio.prompt.edit']()
                                  : m['studio.prompt.product'](),
                              mode
                            )
                          }
                        >
                          <WandSparkles size={13} />
                          {m['studio.try_prompt']()}
                        </button>
                        <small>{field.state.value.length}/2000</small>
                      </div>
                      {field.state.meta.errors.length > 0 && (
                        <p className="field-error" id="prompt-help">
                          {m['studio.prompt_error']()}
                        </p>
                      )}
                    </div>
                  )}
                </form.Field>
                <div className="quick-ideas">
                  <span>{m['studio.quick.label']()}</span>
                  {[
                    {
                      label: m['studio.quick.space'](),
                      prompt: m['studio.prompt.product'](),
                      mode: 'generate' as Mode,
                    },
                    {
                      label: m['studio.quick.city'](),
                      prompt: m['studio.prompt.editorial'](),
                      mode: 'generate' as Mode,
                    },
                    {
                      label: m['studio.quick.sticker'](),
                      prompt: m['studio.prompt.sticker'](),
                      mode: 'transparent' as Mode,
                    },
                  ].map((idea) => (
                    <button
                      key={idea.label}
                      type="button"
                      onClick={() => usePrompt(idea.prompt, idea.mode)}
                    >
                      {idea.label}
                      <span aria-hidden="true">↗</span>
                    </button>
                  ))}
                </div>
                <div className="settings-row">
                  <fieldset className="ratio-setting">
                    <legend>{m['studio.ratio']()}</legend>
                    <div className="ratio-options">
                      {['1:1', '16:9', '9:16', '4:3', '3:4'].map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={ratio === option ? 'selected' : ''}
                          aria-pressed={ratio === option}
                          onClick={() => setRatio(option)}
                        >
                          <span
                            className={
                              'ratio-preview ratio-' + option.replace(':', '-')
                            }
                            aria-hidden="true"
                          />
                          <span>{option}</span>
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <div className="output-setting">
                    <span>{m['studio.output']()}</span>
                    <span className="format-pill">
                      <Layers size={13} />
                      {mode === 'transparent' ? 'RGBA · PNG' : 'PNG'}
                      <Check size={12} />
                    </span>
                  </div>
                </div>
                {mode === 'transparent' && (
                  <p className="alpha-note">
                    <Layers size={13} />
                    {m['studio.alpha_note']()}
                  </p>
                )}
                <button
                  className="generate-button"
                  type="submit"
                  disabled={generation.isPending || sessionPending}
                >
                  {generation.isPending ? (
                    <LoaderCircle className="spin" size={17} />
                  ) : (
                    <Sparkles size={17} />
                  )}
                  {generation.isPending
                    ? m['studio.generating']()
                    : m['studio.generate']()}
                  <ArrowRight size={16} />
                </button>
                <div className="service-note">
                  <span
                    className={
                      status.data?.ready ? 'status-dot live' : 'status-dot'
                    }
                  />
                  {status.isPending
                    ? m['studio.checking']()
                    : status.data?.ready
                      ? m['studio.ready']()
                      : m['studio.preview_mode']()}
                </div>
                {feedback && (
                  <div className="generation-feedback" role="alert">
                    {feedback}
                    {feedback === m['studio.signin_required']() && (
                      <button type="button" onClick={() => setLoginOpen(true)}>
                        {m['studio.signin']()} →
                      </button>
                    )}
                  </div>
                )}
              </form>
            </div>
            <div className="preview-panel">
              <div className="preview-heading">
                <Sparkles size={14} />
                {result ? m['studio.result']() : m['studio.preview']()}
              </div>
              {result ? (
                <>
                  {' '}
                  <div className="preview-card">
                    <div className="preview-top">
                      <div className="window-dots" aria-hidden="true">
                        <i className="window-dot" />
                        <i className="window-dot" />
                        <i className="window-dot" />
                      </div>
                      <span>{result ? 'PNG' : m['studio.sample']()}</span>
                    </div>
                    <div
                      className={
                        result?.transparent
                          ? 'preview-image-wrap checkerboard'
                          : 'preview-image-wrap'
                      }
                    >
                      <img
                        src={result?.url || '/imgs/studio-sample.png'}
                        alt={
                          result
                            ? m['studio.result_alt']()
                            : m['studio.sample_alt']()
                        }
                        className="preview-image"
                      />
                    </div>
                    <div className="preview-caption">
                      <div>
                        <h3>
                          {result
                            ? m['studio.ready_download']()
                            : m['studio.sample_title']()}
                        </h3>
                        <p>
                          {result
                            ? m['studio.creation']()
                            : m['studio.art_direction']()}
                        </p>
                      </div>
                      {result && (
                        <a
                          className="download-button"
                          href={result.url}
                          download="prism-image.png"
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={m['studio.download']()}
                        >
                          <Download size={18} />
                        </a>
                      )}
                    </div>
                    {!result && (
                      <div className="sample-disclaimer">
                        {m['studio.sample_disclaimer']()}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <PreviewCarousel
                  label={m['studio.carousel.label']()}
                  sampleLabel={m['studio.sample']()}
                  disclaimer={m['studio.carousel.disclaimer']()}
                  dotLabel={(index) => m['studio.carousel.dot']({ index })}
                  onSelect={(prompt, mode) => usePrompt(prompt, mode)}
                  slides={[
                    {
                      image: '/imgs/original/space-cat-koi.webp',
                      alt: m['studio.carousel.product_alt'](),
                      prompt: m['studio.prompt.product'](),
                    },
                    {
                      image: '/imgs/original/astronaut-otter-sticker.webp',
                      mode: 'transparent',
                      alt: m['studio.carousel.sticker_alt'](),
                      prompt: m['studio.prompt.sticker'](),
                    },
                    {
                      image: '/imgs/original/ramen-miniature-city.webp',
                      alt: m['studio.carousel.editorial_alt'](),
                      prompt: m['studio.prompt.editorial'](),
                    },
                  ]}
                />
              )}
              {generation.isPending && (
                <div className="generation-overlay" role="status">
                  <LoaderCircle className="spin" size={28} />
                  <p>{m['studio.generating']()}</p>
                </div>
              )}
            </div>
          </div>
        </section>
        <div className="model-facts">
          <span>{m['studio.built_for']()}</span>
          <strong>{m['studio.fact.one']()}</strong>
          <i />
          <strong>{m['studio.fact.two']()}</strong>
          <i />
          <strong>{m['studio.fact.three']()}</strong>
          <a
            href="https://qwen.ai/blog?id=qwen-image-2.1"
            target="_blank"
            rel="noopener noreferrer"
          >
            {m['studio.model_details']()} ↗
          </a>
        </div>
        {page !== 'prompts' && (
          <section className="examples-section" id="inspiration">
            <div className="section-heading">
              <div>
                <span className="eyebrow">{m['studio.inspiration']()}</span>
                <h2>{m['studio.examples_title']()}</h2>
              </div>
              <Link href="/prompts">
                {m['studio.explore_prompts']()}
                <ArrowRight size={16} />
              </Link>
            </div>
            <div className="example-grid">
              {examples.map((example) => (
                <button
                  className="example-card"
                  key={example.label}
                  onClick={() => usePrompt(example.prompt, example.mode)}
                >
                  <div className={'example-art ' + example.className}>
                    <img
                      src={example.image}
                      alt={example.alt}
                      loading="lazy"
                      width={1024}
                      height={1024}
                    />
                    <span className="example-action">
                      <Plus size={18} />
                    </span>
                  </div>
                  <div className="example-info">
                    <span>{example.label}</span>
                    <span>
                      {m['studio.use_prompt']()}
                      <ArrowRight size={13} />
                    </span>
                  </div>
                </button>
              ))}
            </div>
            <p className="examples-note">{m['studio.examples_note']()}</p>
          </section>
        )}
        <section className="capabilities-section">
          <div className="capabilities-intro">
            <span className="eyebrow">{m['studio.capabilities']()}</span>
            <h2>{m['studio.capabilities_title']()}</h2>
            <p>{m['studio.capabilities_subtitle']()}</p>
            <Link href="/transparent-png">
              {m['studio.discover_png']()}
              <ArrowRight size={15} />
            </Link>
          </div>
          <div className="capability-list">
            {[
              {
                icon: Sparkles,
                title: m['studio.feature.generate'](),
                copy: m['studio.feature.generate_copy'](),
              },
              {
                icon: ImagePlus,
                title: m['studio.feature.edit'](),
                copy: m['studio.feature.edit_copy'](),
              },
              {
                icon: Layers,
                title: m['studio.feature.png'](),
                copy: m['studio.feature.png_copy'](),
              },
            ].map((feature, i) => (
              <div key={feature.title}>
                <span className="feature-icon">
                  <feature.icon size={20} />
                </span>
                <div>
                  <span className="feature-number">0{i + 1}</span>
                  <h3>{feature.title}</h3>
                  <p>{feature.copy}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="howto-section" aria-labelledby="howto-title">
          <span className="eyebrow">{m['studio.howto.kicker']()}</span>
          <h2 id="howto-title">{studioHowToTitle(page)}</h2>
          <ol>
            {[
              {
                title: m['studio.howto.one.title'](),
                copy: m['studio.howto.one.copy'](),
              },
              {
                title: m['studio.howto.two.title'](),
                copy: m['studio.howto.two.copy'](),
              },
              {
                title: m['studio.howto.three.title'](),
                copy: m['studio.howto.three.copy'](),
              },
            ].map((step, index) => (
              <li key={step.title}>
                <span className="howto-number">{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.copy}</p>
              </li>
            ))}
          </ol>
          <a href="#workspace">
            {m['studio.back_create']()} <ArrowRight size={15} />
          </a>
        </section>
        <section className="faq-section" id="faq">
          <div>
            <span className="eyebrow">{m['studio.faq']()}</span>
            <h2>{m['studio.faq_title']()}</h2>
            <p>{m['studio.faq_subtitle']()}</p>
          </div>
          <div className="faq-list">
            {studioFaqs(page).map((faq, index) => (
              <details key={faq.q} id={'faq-' + index} open={index === 0}>
                <summary>
                  {faq.q}
                  <Plus size={16} />
                </summary>
                <p>{faq.a}</p>
              </details>
            ))}
          </div>
        </section>
        <section className="closing-section">
          <span className="eyebrow">{m['studio.closing_kicker']()}</span>
          <h2>{m['studio.closing_title']()}</h2>
          <a href="#workspace">
            {m['studio.back_create']()}
            <ArrowDown size={16} />
          </a>
        </section>
      </main>
      <footer className="prism-footer">
        <div className="footer-top">
          <div>
            <Link className="prism-brand" href="/">
              <img src="/logo.svg" width="28" height="28" alt="" />
              <span>{envConfigs.app_name}</span>
            </Link>
            <p>{m['studio.footer_tagline']()}</p>
            <SupportContact />
          </div>
          <div className="footer-links">
            <Link href="/transparent-png">{m['studio.nav.png']()}</Link>
            <Link href="/image-editor">{m['studio.nav.edit']()}</Link>
            <Link href="/prompts">{m['studio.nav.prompts']()}</Link>
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
