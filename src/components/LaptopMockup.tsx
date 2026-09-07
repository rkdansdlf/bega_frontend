import type { LaptopMockupProps } from '../types/landing';

export default function LaptopMockup({
  activeFeature,
  features,
}: LaptopMockupProps) {
  const feature = features[activeFeature];
  const sourceImage = feature.mobileImage || feature.image;
  const fallbackImage = feature.image;

  return (
    <div
      className="landing-scroll-frame sticky top-28"
      data-testid="landing-laptop-mockup"
    >
      <div className="landing-preview-shell">
        <div className="landing-preview-header">
          <span>{feature.title}</span>
          <p>{feature.description}</p>
        </div>

        <div className="landing-preview-screen">
          <img
            key={activeFeature}
            src={sourceImage}
            alt={feature.title}
            data-testid="landing-laptop-image"
            className="h-full w-full object-contain animate-fade-in"
            onError={(event) => {
              const target = event.currentTarget;
              if (target.dataset.fallbacked !== '1' && sourceImage !== fallbackImage) {
                target.dataset.fallbacked = '1';
                target.src = fallbackImage;
                return;
              }
              target.hidden = true;
              target.nextElementSibling?.removeAttribute('hidden');
            }}
          />
          <span
            hidden
            role="status"
            data-testid="landing-laptop-image-fallback"
            className="landing-preview-image-fallback"
          >
            미리보기 이미지를 불러올 수 없습니다.
          </span>
        </div>
      </div>
    </div>
  );
}
