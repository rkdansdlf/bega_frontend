import React from 'react';
import { Button } from './button';
import { Card } from './card';
import { useTheme } from '../../hooks/useTheme';

export default function UIKitPreview() {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <div
      className="mx-auto max-w-5xl space-y-10 bg-background px-4 py-6 text-foreground sm:p-8 sm:space-y-12"
      data-testid="ui-kit-preview"
    >
      <header className="flex flex-col items-start gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-black text-primary sm:text-4xl">KBO Platform UI Kit</h1>
          <p className="text-muted-foreground mt-2">Design System & Component Library</p>
        </div>
        <Button
          aria-label={isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}
          aria-pressed={isDark}
          className="min-h-11 w-full whitespace-nowrap sm:w-auto"
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
          variant="outline"
        >
          {isDark ? '🌙 Dark Mode' : '☀️ Light Mode'}
        </Button>
      </header>

      {/* Typography Section */}
      <section className="space-y-4">
        <h2 className="border-l-4 border-primary pl-3 text-xl font-bold sm:text-2xl">Typography</h2>
        <div className="grid gap-6 rounded-xl bg-muted/50 p-4 sm:p-6">
          <div>
            <p className="text-sm text-muted-foreground mb-2">Pretendard (Sans)</p>
            <p className="break-words text-2xl sm:text-3xl">The quick brown fox jumps over the lazy dog.</p>
            <p className="break-words text-lg font-bold sm:text-xl">다람쥐 헌 쳇바퀴에 타고파 (나랏말싸미)</p>
          </div>
          <div className="font-retro">
            <p className="mb-2 font-sans text-sm text-muted-foreground">Press Start 2P (Retro)</p>
            <p className="text-lg">KBO CHAMPIONSHIP 2026</p>
          </div>
          <div className="font-pixel">
            <p className="mb-2 font-sans text-sm text-muted-foreground">Galmuri (Pixel)</p>
            <p className="text-2xl">승리는 우리의 것! 베가 야구 플랫폼</p>
          </div>
        </div>
      </section>

      {/* Colors Section */}
      <section className="space-y-4">
        <h2 className="border-l-4 border-primary pl-3 text-xl font-bold sm:text-2xl">Color Palette</h2>
        <div
          className="grid grid-cols-2 gap-4 md:grid-cols-4"
          data-testid="ui-kit-color-palette"
          role="list"
        >
          <ColorSwatch name="Primary" bg="bg-primary" text="text-primary-foreground" />
          <ColorSwatch name="Secondary" bg="bg-secondary" text="text-secondary-foreground" />
          <ColorSwatch name="Accent" bg="bg-accent" text="text-accent-foreground" />
          <ColorSwatch name="Destructive" bg="bg-destructive" text="text-destructive-foreground" />
          <ColorSwatch name="Muted" bg="bg-muted" text="text-muted-foreground" />
        </div>
      </section>

      {/* Buttons Section */}
      <section className="space-y-4">
        <h2 className="border-l-4 border-primary pl-3 text-xl font-bold sm:text-2xl">Components - Buttons</h2>
        <div className="flex flex-wrap gap-4 rounded-xl border p-4 sm:p-6">
          <Button className="btn-brand">Brand Primary</Button>
          <Button variant="outline" className="btn-brand-outline">Brand Outline</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="link">Link Button</Button>
          <Button disabled>Disabled Button</Button>
        </div>
      </section>

      {/* Card Section */}
      <section className="space-y-4">
        <h2 className="border-l-4 border-primary pl-3 text-xl font-bold sm:text-2xl">Components - Cards</h2>
        <div className="grid gap-6 md:grid-cols-2">
          <Card className="p-4 sm:p-6">
            <h3 className="text-xl font-bold mb-2">Standard Card</h3>
            <p className="text-muted-foreground">This is a default card using our design system's border radius and subtle shadows.</p>
            <div className="mt-4 flex gap-2">
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Tag 1</span>
              <span className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">Tag 2</span>
            </div>
          </Card>
          
          <Card className="border-primary bg-primary/5 p-4 sm:p-6">
            <h3 className="text-xl font-bold mb-2 text-primary">Featured Card</h3>
            <p className="text-muted-foreground">A highlighted card version with primary brand accents.</p>
            <Button size="sm" className="mt-4 btn-brand">Action</Button>
          </Card>
        </div>
      </section>
    </div>
  );
}

function ColorSwatch({ name, bg, text }: { name: string; bg: string; text: string }) {
  return (
    <div
      className={`${bg} ${text} flex aspect-square min-w-0 flex-col items-center justify-center rounded-lg p-3 text-center shadow-sm sm:p-4`}
      role="listitem"
    >
      <span className="font-bold">{name}</span>
      <span className="text-10 opacity-70">Variable</span>
    </div>
  );
}
