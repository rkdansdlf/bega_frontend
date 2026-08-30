import { useEffect } from 'react';

import { LANDING_APP_PREVIEW_HINT, LANDING_APP_PREVIEW_HINT_AUTO } from './landingShowcaseData';

const COUNT_DURATION_MS = 1_200;
const PHONE_DESKTOP_MIN_WIDTH = 800;
const PHONE_AUTO_ROTATE_MS = 3_500;
const PHONE_SCREEN_COUNT = 3;
const PHONE_ACTIVE_TAB_COLOR = '#2d5f4f';
const PHONE_INACTIVE_TAB_COLOR = '#536471';
const PHONE_ACTIVE_STEP_COLOR = '#ffffff';
const PHONE_INACTIVE_STEP_COLOR = '#d6ece4';
const PHONE_ACTIVE_STEP_DOT = '#ffffff';
const PHONE_INACTIVE_STEP_DOT = '#63b39b';

const finishMotionContent = (node: HTMLElement) => {
  node.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar) => {
    bar.style.width = bar.dataset.bar ?? '';
  });

  node.querySelectorAll<HTMLElement>('[data-count]').forEach((count) => {
    const target = Number(count.dataset.count);
    if (Number.isFinite(target)) {
      count.textContent = `${target.toLocaleString()}${count.dataset.suffix ?? ''}`;
    }
  });
};

const applyPhoneScreenIndex = (scene: HTMLElement, index: number, animate: boolean) => {
  scene.querySelectorAll<HTMLElement>('[data-phone-screen]').forEach((screen) => {
    const screenIndex = Number(screen.dataset.phoneScreen);
    screen.style.transition = animate ? 'opacity .4s ease-out, transform .4s ease-out' : 'none';
    screen.style.opacity = screenIndex === index ? '1' : '0';
    screen.style.transform = screenIndex === index ? 'translateY(0)' : `translateY(${screenIndex < index ? -16 : 16}px)`;
    screen.style.pointerEvents = screenIndex === index ? 'auto' : 'none';
  });
  scene.querySelectorAll<HTMLElement>('[data-phone-tab]').forEach((tab) => {
    const tabIndex = Number(tab.dataset.phoneTab);
    tab.style.color = tabIndex === index ? PHONE_ACTIVE_TAB_COLOR : PHONE_INACTIVE_TAB_COLOR;
    tab.style.fontWeight = tabIndex === index ? '800' : '700';
  });
  scene.querySelectorAll<HTMLElement>('[data-phone-step]').forEach((step) => {
    const stepIndex = Number(step.dataset.phoneStep);
    step.style.color = stepIndex === index ? PHONE_ACTIVE_STEP_COLOR : PHONE_INACTIVE_STEP_COLOR;
    step.style.opacity = stepIndex === index ? '1' : '.6';
    const dot = step.firstElementChild as HTMLElement | null;
    if (dot) dot.style.background = stepIndex === index ? PHONE_ACTIVE_STEP_DOT : PHONE_INACTIVE_STEP_DOT;
  });
};

const setPhoneSceneStatic = (scene: HTMLElement) => {
  applyPhoneScreenIndex(scene, 0, false);
  scene.style.height = 'auto';

  const sticky = scene.querySelector<HTMLElement>('[data-phone-sticky]');
  if (sticky) {
    sticky.style.position = 'relative';
    sticky.style.height = 'auto';
  }

  const scale = scene.querySelector<HTMLElement>('[data-phone-scale]');
  if (scale) delete scale.dataset.phoneMode;

  const hint = scene.querySelector<HTMLElement>('[data-phone-hint]');
  if (hint) hint.style.display = 'none';
};

export default function useLandingMotion(): void {
  useEffect(() => {
    const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const revealNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    const loopNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-motion-loop], [data-anim]'));
    const barNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-bar]'));
    const countFrames = new Set<number>();
    const parallaxNodes = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    const phoneScenes = Array.from(document.querySelectorAll<HTMLElement>('[data-phone-scene]'));
    let observer: IntersectionObserver | null = null;
    let parallaxFrame: number | null = null;
    let parallaxListening = false;
    let phoneSceneCleanups: Array<() => void> = [];

    const stopActiveMotion = () => {
      observer?.disconnect();
      observer = null;
      if (parallaxListening) {
        window.removeEventListener('scroll', scheduleParallax);
        parallaxListening = false;
      }
      if (parallaxFrame !== null) {
        window.cancelAnimationFrame(parallaxFrame);
        parallaxFrame = null;
      }
      countFrames.forEach((frame) => window.cancelAnimationFrame(frame));
      countFrames.clear();
      phoneSceneCleanups.forEach((cleanup) => cleanup());
      phoneSceneCleanups = [];
    };

    const finishForReducedMotion = () => {
      stopActiveMotion();
      loopNodes.forEach((node) => {
        node.style.animation = 'none';
      });
      barNodes.forEach((node) => {
        node.style.transition = 'none';
      });
      revealNodes.forEach((node) => {
        node.dataset.revealed = 'true';
        finishMotionContent(node);
      });
      phoneScenes.forEach(setPhoneSceneStatic);
    };

    const setupPhoneScene = (scene: HTMLElement): (() => void) | null => {
      const sticky = scene.querySelector<HTMLElement>('[data-phone-sticky]');
      const scale = scene.querySelector<HTMLElement>('[data-phone-scale]');
      const hint = scene.querySelector<HTMLElement>('[data-phone-hint]');
      const screenCount = scene.querySelectorAll('[data-phone-screen]').length;
      if (!sticky || screenCount < PHONE_SCREEN_COUNT) return null;

      let current = -1;
      let scrollFrame: number | null = null;
      let rotateTimer: number | null = null;
      let lastMode: boolean | null = null;

      const setScreen = (index: number) => {
        if (index === current) return;
        current = index;
        applyPhoneScreenIndex(scene, index, true);
      };

      const sceneOn = () => window.innerWidth >= PHONE_DESKTOP_MIN_WIDTH;

      const updateScroll = () => {
        scrollFrame = null;
        if (!sceneOn()) return;
        const rect = scene.getBoundingClientRect();
        const progress = Math.min(1, Math.max(0, -rect.top / Math.max(1, rect.height - window.innerHeight)));
        setScreen(progress < 1 / 3 ? 0 : progress < 2 / 3 ? 1 : 2);
      };

      const scheduleScroll = () => {
        if (scrollFrame !== null) return;
        scrollFrame = window.requestAnimationFrame(updateScroll);
      };

      const applyMode = () => {
        const desktop = sceneOn();
        if (desktop === lastMode) return;
        lastMode = desktop;
        if (desktop) {
          scene.style.height = '260vh';
          sticky.style.position = 'sticky';
          sticky.style.top = '0';
          sticky.style.height = '100vh';
          if (scale) scale.dataset.phoneMode = 'scroll';
          if (hint) hint.textContent = LANDING_APP_PREVIEW_HINT;
          if (rotateTimer !== null) {
            window.clearInterval(rotateTimer);
            rotateTimer = null;
          }
        } else {
          scene.style.height = 'auto';
          sticky.style.position = 'relative';
          sticky.style.height = 'auto';
          if (scale) delete scale.dataset.phoneMode;
          if (hint) hint.textContent = LANDING_APP_PREVIEW_HINT_AUTO;
          if (rotateTimer === null) {
            rotateTimer = window.setInterval(() => setScreen((current + 1) % PHONE_SCREEN_COUNT), PHONE_AUTO_ROTATE_MS);
          }
        }
        scheduleScroll();
      };

      window.addEventListener('scroll', scheduleScroll, { passive: true });
      window.addEventListener('resize', applyMode);
      applyMode();
      if (current < 0) setScreen(0);

      return () => {
        window.removeEventListener('scroll', scheduleScroll);
        window.removeEventListener('resize', applyMode);
        if (scrollFrame !== null) window.cancelAnimationFrame(scrollFrame);
        if (rotateTimer !== null) window.clearInterval(rotateTimer);
      };
    };

    const handleMotionPreferenceChange = (event: MediaQueryListEvent) => {
      if (event.matches) {
        finishForReducedMotion();
        return;
      }

      loopNodes.forEach((node) => node.style.removeProperty('animation'));
      barNodes.forEach((node) => node.style.removeProperty('transition'));
    };

    motionPreference.addEventListener('change', handleMotionPreferenceChange);

    const countUp = (node: HTMLElement) => {
      if (node.dataset.counted === 'true') return;

      const target = Number(node.dataset.count);
      if (!Number.isFinite(target)) return;

      node.dataset.counted = 'true';
      const suffix = node.dataset.suffix ?? '';
      const startedAt = performance.now();

      const step = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / COUNT_DURATION_MS);
        const eased = 1 - (1 - progress) ** 3;
        node.textContent = `${Math.round(target * eased).toLocaleString()}${suffix}`;

        if (progress < 1) {
          const frame = window.requestAnimationFrame(step);
          countFrames.add(frame);
        }
      };

      const frame = window.requestAnimationFrame(step);
      countFrames.add(frame);
    };

    const reveal = (node: HTMLElement) => {
      node.dataset.revealed = 'true';
      node.style.transitionDelay = `${node.dataset.reveal ?? 0}ms`;
      node.querySelectorAll<HTMLElement>('[data-bar]').forEach((bar) => {
        bar.style.width = bar.dataset.bar ?? '';
      });
      node.querySelectorAll<HTMLElement>('[data-count]').forEach(countUp);
    };

    const updateParallax = () => {
      parallaxFrame = null;

      parallaxNodes.forEach((node) => {
        const parent = node.parentElement;
        if (!parent) return;

        const rect = parent.getBoundingClientRect();
        const speed = Number(node.dataset.parallax);
        if (!Number.isFinite(speed)) return;

        const rawOffset = (rect.top + rect.height / 2 - window.innerHeight / 2) * speed;
        const limit = Number(node.dataset.parallaxLimit);
        const offset = Number.isFinite(limit)
          ? Math.max(-limit, Math.min(limit, rawOffset))
          : rawOffset;
        node.style.transform = node.hasAttribute('data-parallax-center')
          ? `translate(-50%, -50%) translateY(${-offset}px)`
          : `translateY(${-offset}px)`;
      });
    };

    function scheduleParallax() {
      if (parallaxFrame !== null) return;
      parallaxFrame = window.requestAnimationFrame(updateParallax);
    }

    if (motionPreference.matches) {
      finishForReducedMotion();
      return () => {
        motionPreference.removeEventListener('change', handleMotionPreferenceChange);
        stopActiveMotion();
      };
    }

    if (typeof IntersectionObserver !== 'function') {
      revealNodes.forEach((node) => node.dataset.revealed = 'true');
      revealNodes.forEach(finishMotionContent);
      phoneScenes.forEach(setPhoneSceneStatic);
      return () => {
        motionPreference.removeEventListener('change', handleMotionPreferenceChange);
        stopActiveMotion();
      };
    }

    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        const node = entry.target as HTMLElement;
        reveal(node);
        observer?.unobserve(node);
      });
    }, { threshold: 0.18 });

    revealNodes.forEach((node) => observer?.observe(node));

    window.addEventListener('scroll', scheduleParallax, { passive: true });
    parallaxListening = true;
    scheduleParallax();

    phoneScenes.forEach((scene) => {
      const cleanup = setupPhoneScene(scene);
      if (cleanup) phoneSceneCleanups.push(cleanup);
    });

    return () => {
      motionPreference.removeEventListener('change', handleMotionPreferenceChange);
      stopActiveMotion();
    };
  }, []);
}
