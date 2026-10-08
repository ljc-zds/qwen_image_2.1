import { m } from '@/paraglide/messages.js';
import { PromptGallery, type PromptExample } from '@/components/prompt-gallery';

import '@/styles/prompt-library.css';

import { promptExamples } from '@/blocks/prompt-library-catalog';

export function PromptLibrary({
  onUse,
}: {
  onUse: (prompt: string, mode: PromptExample['mode']) => void;
}) {
  const categories = [
    { id: 'surreal', label: m['studio.library.category.surreal']() },
    { id: 'portrait', label: m['studio.library.category.portrait']() },
    { id: 'food', label: m['studio.library.category.food']() },
    { id: 'product', label: m['studio.library.category.product']() },
    { id: 'illustration', label: m['studio.library.category.illustration']() },
    { id: 'sticker', label: m['studio.library.category.sticker']() },
  ];
  const items = promptExamples();
  return (
    <section className="prompt-library" id="inspiration">
      <div className="library-intro">
        <div>
          <span className="eyebrow">{m['studio.library.eyebrow']()}</span>
          <h2>{m['studio.library.title']()}</h2>
        </div>
        <p>{m['studio.library.intro']()}</p>
      </div>
      <PromptGallery
        items={items}
        categories={categories}
        labels={{
          all: m['studio.library.all'](),
          copy: m['studio.library.copy'](),
          copied: m['studio.library.copied'](),
          copyError: m['studio.library.copyError'](),
          use: m['studio.library.use'](),
          full: m['studio.library.full'](),
          more: m['studio.library.more'](),
          showing: (shown, total) =>
            m['studio.library.showing']({ shown, total }),
          count: (count) => m['studio.library.count']({ count }),
        }}
        onUse={onUse}
      />
      <p className="library-note">{m['studio.library.note']()}</p>
    </section>
  );
}
