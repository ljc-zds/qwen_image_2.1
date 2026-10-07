import { m } from '@/paraglide/messages.js';
import { PromptGallery, type PromptExample } from '@/components/prompt-gallery';

import '@/styles/prompt-library.css';

import { expandedPromptExamples } from '@/blocks/prompt-library-catalog';

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
  const items: PromptExample[] = [
    ...expandedPromptExamples(),
    {
      id: 'space-cat',
      title: m['studio.example.product'](),
      category: 'surreal',
      image: '/imgs/original/space-cat-koi.webp',
      alt: m['studio.carousel.product_alt'](),
      prompt: m['studio.prompt.product'](),
      mode: 'generate',
    },
    {
      id: 'cloud-house',
      title: m['studio.library.cloud_house.title'](),
      category: 'surreal',
      image: '/imgs/original/cloud-house.webp',
      alt: m['studio.library.cloud_house.title'](),
      prompt: m['studio.library.cloud_house.prompt'](),
      mode: 'generate',
    },
    {
      id: 'rain-portrait',
      title: m['studio.library.rain_portrait.title'](),
      category: 'portrait',
      image: '/imgs/original/rain-portrait.webp',
      alt: m['studio.library.rain_portrait.title'](),
      prompt: m['studio.library.rain_portrait.prompt'](),
      mode: 'generate',
    },
    {
      id: 'ramen-city',
      title: m['studio.example.editorial'](),
      category: 'surreal',
      image: '/imgs/original/ramen-miniature-city.webp',
      alt: m['studio.carousel.editorial_alt'](),
      prompt: m['studio.prompt.editorial'](),
      mode: 'generate',
    },
    {
      id: 'matcha-dessert',
      title: m['studio.library.matcha_dessert.title'](),
      category: 'food',
      image: '/imgs/original/matcha-dessert.webp',
      alt: m['studio.library.matcha_dessert.title'](),
      prompt: m['studio.library.matcha_dessert.prompt'](),
      mode: 'generate',
    },
    {
      id: 'fox-library',
      title: m['studio.library.fox_library.title'](),
      category: 'illustration',
      image: '/imgs/original/fox-library.webp',
      alt: m['studio.library.fox_library.title'](),
      prompt: m['studio.library.fox_library.prompt'](),
      mode: 'generate',
    },
    {
      id: 'chrome-sneaker',
      title: m['studio.library.chrome_sneaker.title'](),
      category: 'product',
      image: '/imgs/original/chrome-sneaker.webp',
      alt: m['studio.library.chrome_sneaker.title'](),
      prompt: m['studio.library.chrome_sneaker.prompt'](),
      mode: 'generate',
    },
    {
      id: 'otter-sticker',
      title: m['studio.example.sticker'](),
      category: 'sticker',
      image: '/imgs/original/astronaut-otter-sticker.webp',
      alt: m['studio.carousel.sticker_alt'](),
      prompt: m['studio.prompt.sticker'](),
      mode: 'transparent',
    },
    {
      id: 'perfume',
      title: m['studio.library.perfume.title'](),
      category: 'product',
      image: '/imgs/original/perfume-product.webp',
      alt: m['studio.library.perfume.title'](),
      prompt: m['studio.library.perfume.prompt'](),
      mode: 'generate',
    },
  ];
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
