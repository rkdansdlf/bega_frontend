import { createElement, useState } from 'react';

import ImageLightbox from '../ImageLightbox';

type ImageLightboxData = 'single' | 'multiple-three' | 'maximum-supported' | 'broken-image';

const createSvgDataUri = (label: string, color: string) => (
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="${color}"/><text x="320" y="250" text-anchor="middle" fill="white" font-size="48">${label}</text></svg>`,
  )}`
);

const imageFixtures: Record<ImageLightboxData, string[]> = {
  single: [createSvgDataUri('1', '#155e75')],
  'multiple-three': [
    createSvgDataUri('1', '#155e75'),
    createSvgDataUri('2', '#7c3aed'),
    createSvgDataUri('3', '#b45309'),
  ],
  'maximum-supported': Array.from({ length: 10 }, (_, index) => (
    createSvgDataUri(String(index + 1), index % 2 === 0 ? '#155e75' : '#7c3aed')
  )),
  'broken-image': ['data:image/png;base64,this-is-not-a-valid-image'],
};

function imageLightboxStatefulHost({
  data,
  initialIndex,
  scenarioKey,
}: {
  data: ImageLightboxData;
  initialIndex: number;
  scenarioKey: string;
}) {
  const images = imageFixtures[data];
  const [open, setOpen] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [closeCount, setCloseCount] = useState(0);
  const [prevCount, setPrevCount] = useState(0);
  const [nextCount, setNextCount] = useState(0);

  return (
    <>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 h-px w-px overflow-hidden"
        data-testid="image-lightbox-stateful-host"
        data-vqa-close-count={closeCount}
        data-vqa-prev-count={prevCount}
        data-vqa-next-count={nextCount}
        data-vqa-current-index={currentIndex}
        data-vqa-effective-open={open}
        data-vqa-scenario-key={scenarioKey}
      />
      {open ? (
        <ImageLightbox
          images={images}
          currentIndex={currentIndex}
          onClose={() => {
            setCloseCount((count) => count + 1);
            setOpen(false);
          }}
          onPrev={() => {
            setPrevCount((count) => count + 1);
            setCurrentIndex((index) => (index - 1 + images.length) % images.length);
          }}
          onNext={() => {
            setNextCount((count) => count + 1);
            setCurrentIndex((index) => (index + 1) % images.length);
          }}
        />
      ) : null}
    </>
  );
}

export function imageLightboxVisualQaHarness(props: {
  data: ImageLightboxData;
  initialIndex: number;
  scenarioKey: string;
}) {
  return createElement(imageLightboxStatefulHost, {
    ...props,
    key: props.scenarioKey,
  });
}
