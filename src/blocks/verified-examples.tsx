import { m } from '@/paraglide/messages.js';

export function VerifiedExamples() {
  const examples = [
    {
      id: 'space-cat-koi',
      title: m['studio.quick.space'](),
      alt: m['studio.carousel.product_alt'](),
      prompt: m['studio.prompt.product'](),
    },
    {
      id: 'astronaut-otter-sticker',
      title: m['studio.example.sticker'](),
      alt: m['studio.carousel.sticker_alt'](),
      prompt: m['studio.prompt.sticker'](),
    },
    {
      id: 'ramen-miniature-city',
      title: m['studio.quick.city'](),
      alt: m['studio.carousel.editorial_alt'](),
      prompt: m['studio.prompt.editorial'](),
    },
  ];
  return (
    <section
      id="verified"
      className="verified-examples"
      aria-labelledby="verified-title"
    >
      <h2 id="verified-title">{m['studio.evidence.title']()}</h2>
      <p>{m['studio.evidence.copy']()}</p>
      <div className="verified-grid">
        {examples.map((item) => (
          <article key={item.id}>
            <h3>{item.title}</h3>
            <figure>
              <img
                src={`/imgs/original/${item.id}.webp`}
                width={1024}
                height={1024}
                loading="lazy"
                alt={item.alt}
              />
            </figure>
            <details>
              <summary>{m['studio.evidence.prompt']()}</summary>
              <p>{item.prompt}</p>
            </details>
            <a href={`/imgs/original/${item.id}.webp`} download>
              {m['studio.evidence.download_sample']()} ↓
            </a>
          </article>
        ))}
      </div>
    </section>
  );
}
