import type { StudioPageKind } from '@/lib/studio-seo';
import { m } from '@/paraglide/messages.js';

export function studioFaqs(page: StudioPageKind) {
  const shared = [
    { q: m['studio.faq.model.q'](), a: m['studio.faq.model.a']() },
    {
      q: m['studio.faq.availability.q'](),
      a: m['studio.faq.availability.a'](),
    },
    { q: m['studio.faq.reference.q'](), a: m['studio.faq.reference.a']() },
    { q: m['studio.faq.artwork.q'](), a: m['studio.faq.artwork.a']() },
    { q: m['studio.faq.privacy.q'](), a: m['studio.faq.privacy.a']() },
    { q: m['studio.faq.commercial.q'](), a: m['studio.faq.commercial.a']() },
  ];
  const specific = {
    home: [
      {
        q: m['studio.faq.home.prompt.q'](),
        a: m['studio.faq.home.prompt.a'](),
      },
      { q: m['studio.faq.home.modes.q'](), a: m['studio.faq.home.modes.a']() },
      { q: m['studio.faq.home.ratio.q'](), a: m['studio.faq.home.ratio.a']() },
    ],
    transparent: [
      {
        q: m['studio.faq.transparent.alpha.q'](),
        a: m['studio.faq.transparent.alpha.a'](),
      },
      {
        q: m['studio.faq.transparent.prompt.q'](),
        a: m['studio.faq.transparent.prompt.a'](),
      },
      {
        q: m['studio.faq.transparent.uses.q'](),
        a: m['studio.faq.transparent.uses.a'](),
      },
    ],
    editor: [
      {
        q: m['studio.faq.editor.preserve.q'](),
        a: m['studio.faq.editor.preserve.a'](),
      },
      {
        q: m['studio.faq.editor.background.q'](),
        a: m['studio.faq.editor.background.a'](),
      },
      {
        q: m['studio.faq.editor.format.q'](),
        a: m['studio.faq.editor.format.a'](),
      },
    ],
    prompts: [
      {
        q: m['studio.faq.prompts.reuse.q'](),
        a: m['studio.faq.prompts.reuse.a'](),
      },
      {
        q: m['studio.faq.prompts.match.q'](),
        a: m['studio.faq.prompts.match.a'](),
      },
      {
        q: m['studio.faq.prompts.languages.q'](),
        a: m['studio.faq.prompts.languages.a'](),
      },
    ],
  };
  return [shared[0], ...specific[page], ...shared.slice(1)];
}
export function studioHowToTitle(page: StudioPageKind) {
  return page === 'transparent'
    ? m['studio.howto.transparent.title']()
    : page === 'editor'
      ? m['studio.howto.editor.title']()
      : page === 'prompts'
        ? m['studio.howto.prompts.title']()
        : m['studio.howto.home.title']();
}
