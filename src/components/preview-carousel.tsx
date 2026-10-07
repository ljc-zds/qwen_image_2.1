import { useEffect, useState } from 'react';

import '@/styles/preview-carousel.css';

type Slide = {
  image: string;
  alt: string;
  prompt: string;
  mode?: 'generate' | 'edit' | 'transparent';
};
export function PreviewCarousel({
  slides,
  label,
  sampleLabel,
  disclaimer,
  dotLabel,
  onSelect,
}: {
  slides: Slide[];
  label: string;
  sampleLabel: string;
  disclaimer: string;
  dotLabel: (index: number) => string;
  onSelect: (
    prompt: string,
    mode?: 'generate' | 'edit' | 'transparent'
  ) => void;
}) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches)
      return;
    const timer = window.setInterval(() => {
      if (!document.hidden) setActive((index) => (index + 1) % slides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [paused, slides.length]);
  return (
    <div
      className="showcase-carousel"
      role="group"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setPaused(false);
      }}
    >
      <div className="preview-stack">
        {slides.map((slide, index) => {
          const position = (index - active + slides.length) % slides.length;
          return (
            <button
              type="button"
              key={slide.image}
              className={
                'preview-card showcase-slide ' +
                (position === 0
                  ? 'is-front'
                  : position === 1
                    ? 'is-next'
                    : 'is-back')
              }
              aria-label={position === 0 ? slide.alt : dotLabel(index + 1)}
              tabIndex={position === 0 ? 0 : -1}
              onClick={() =>
                position === 0
                  ? onSelect(slide.prompt, slide.mode)
                  : setActive(index)
              }
            >
              <div className="preview-top">
                <div className="window-dots" aria-hidden="true">
                  <i className="window-dot" />
                  <i className="window-dot" />
                  <i className="window-dot" />
                </div>
                <span>{sampleLabel}</span>
              </div>
              <div
                className={
                  slide.mode === 'transparent'
                    ? 'preview-image-wrap checkerboard original-sticker'
                    : 'preview-image-wrap'
                }
              >
                <img
                  className="preview-image"
                  src={slide.image}
                  alt={slide.alt}
                  draggable={false}
                  width={1024}
                  height={1024}
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
              </div>
              <div className="showcase-prompt">
                <span className="quote-open" aria-hidden="true">
                  “
                </span>
                <p>{slide.prompt}</p>
                <span className="quote-close" aria-hidden="true">
                  ”
                </span>
              </div>
              <div className="sample-disclaimer">{disclaimer}</div>
            </button>
          );
        })}
      </div>
      <div className="carousel-dots" aria-label={label}>
        {slides.map((slide, index) => (
          <button
            key={slide.image}
            type="button"
            className={active === index ? 'active' : ''}
            aria-label={dotLabel(index + 1)}
            aria-current={active === index ? 'true' : undefined}
            onClick={() => setActive(index)}
          />
        ))}
      </div>
    </div>
  );
}
