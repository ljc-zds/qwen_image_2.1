import { useState } from 'react';
import { ArrowUpRight, Check, Copy } from 'lucide-react';

export type PromptExample = {
  id: string;
  title: string;
  category: 'surreal' | 'portrait' | 'food' | 'product' | 'illustration' | 'sticker';
  image: string;
  alt: string;
  prompt: string;
  mode: 'generate' | 'transparent';
};

type Props = {
  items: PromptExample[];
  categories: { id: string; label: string }[];
  labels: {
    all: string;
    copy: string;
    copied: string;
    copyError: string;
    use: string;
    full: string;
    more: string;
    showing: (shown: number, total: number) => string;
    count: (count: number) => string;
  };
  onUse: (prompt: string, mode: PromptExample['mode']) => void;
};

export function PromptGallery({ items, categories, labels, onUse }: Props) {
  const [category, setCategory] = useState('all');
  const [limit, setLimit] = useState(12);
  const [copied, setCopied] = useState<string | null>(null);
  const [copyError, setCopyError] = useState(false);
  const visible = items.filter(
    (item) => category === 'all' || item.category === category
  );

  async function copy(item: PromptExample) {
    try {
      await navigator.clipboard.writeText(item.prompt);
      setCopied(item.id);
      setCopyError(false);
    } catch {
      setCopyError(true);
    }
  }

  return (
    <>
      <div className="library-filters" aria-label={labels.all}>
        {[{ id: 'all', label: labels.all }, ...categories].map((option) => (
          <button
            key={option.id}
            type="button"
            aria-pressed={category === option.id}
            onClick={() => {
              setCategory(option.id);
              setLimit(12);
            }}
          >
            {option.label}
          </button>
        ))}
        <span className="library-count" role="status">
          {labels.count(visible.length)}
        </span>
      </div>
      {copyError && (
        <p className="library-feedback" role="status">
          {labels.copyError}
        </p>
      )}
      <div className="library-grid">
        {visible.map((item, index) => (
          <article
            className="library-card"
            key={item.id}
            hidden={index >= limit}
          >
            <button
              className={
                'library-art' +
                (item.mode === 'transparent' ? ' checkerboard' : '')
              }
              type="button"
              onClick={() => onUse(item.prompt, item.mode)}
              aria-label={labels.use + ': ' + item.title}
            >
              <img
                src={item.image}
                alt={item.alt}
                width={1024}
                height={1024}
                loading="lazy"
              />
              <span>
                {labels.use}
                <ArrowUpRight size={15} />
              </span>
            </button>
            <div className="library-card-body">
              <span className="library-category">
                {
                  categories.find((option) => option.id === item.category)
                    ?.label
                }
              </span>
              <h3>{item.title}</h3>
              <p className="library-excerpt">{item.prompt}</p>
              <details className="library-details">
                <summary>{labels.full}</summary>
                <p>{item.prompt}</p>
              </details>
              <div className="library-card-actions">
                <button type="button" onClick={() => void copy(item)}>
                  {copied === item.id ? (
                    <Check size={14} />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copied === item.id ? labels.copied : labels.copy}
                </button>
                <button
                  type="button"
                  onClick={() => onUse(item.prompt, item.mode)}
                >
                  {labels.use}
                  <ArrowUpRight size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="library-pagination">
        <p role="status">
          {labels.showing(Math.min(limit, visible.length), visible.length)}
        </p>
        {limit < visible.length && (
          <button
            type="button"
            onClick={() => setLimit((current) => current + 12)}
          >
            {labels.more}
            <ArrowUpRight size={15} />
          </button>
        )}
      </div>
    </>
  );
}
