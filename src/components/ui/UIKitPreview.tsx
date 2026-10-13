import React, { useState } from 'react';
import { Button } from './button';
import { Button as PlainButton } from './plain-button';
import { Card } from './card';
import { Input } from './input';
import { Textarea } from './textarea';
import { StatusBadge } from './status-badge';
import { Skeleton } from './skeleton';
import PlainDialog from './plain-dialog';
import EmptyState from '../common/EmptyState';
import { useTheme } from '../../hooks/useTheme';

export default function UIKitPreview() {
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const [dialogOpen, setDialogOpen] = useState(false);

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
        <div className="grid gap-4 rounded-xl border p-4 sm:p-6" data-testid="ui-kit-button-comparison">
          <p className="text-sm text-muted-foreground">같은 variant: Button / PlainButton. Tab 키로 포커스 상태를 비교합니다.</p>
          {(['default', 'outline', 'ghost', 'secondary', 'destructive', 'link'] as const).map((variant) => (
            <div key={variant} className="grid min-w-0 grid-cols-2 items-start gap-3">
              <Button variant={variant}>{variant}</Button>
              <PlainButton variant={variant}>{variant}</PlainButton>
            </div>
          ))}
          <div className="grid min-w-0 grid-cols-2 items-start gap-3">
            <Button disabled>비활성화</Button>
            <PlainButton disabled>비활성화</PlainButton>
            <Button variant="outline" aria-invalid="true">입력 오류</Button>
            <PlainButton variant="outline" aria-invalid="true">입력 오류</PlainButton>
            <Button size="sm">작은 버튼</Button>
            <PlainButton size="sm">작은 버튼</PlainButton>
            <Button size="touch">긴 문구가 여러 줄이어도 내용을 확인할 수 있는 버튼</Button>
            <PlainButton size="touch">긴 문구가 여러 줄이어도 내용을 확인할 수 있는 버튼</PlainButton>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="brand">Brand Primary</Button>
            <Button variant="brandOutline">Brand Outline</Button>
            <Button size="iconTouch" aria-label="일반 아이콘 버튼">+</Button>
            <PlainButton size="iconTouch" aria-label="경량 아이콘 버튼">+</PlainButton>
          </div>
        </div>
      </section>

      <section className="space-y-4" data-testid="ui-kit-form-controls">
        <h2 className="border-l-4 border-primary pl-3 text-xl font-bold sm:text-2xl">Components - Forms</h2>
        <Card className="p-4 sm:p-6">
          <div className="grid min-w-0 gap-4 md:grid-cols-2">
            <div className="min-w-0 space-y-2">
              <label htmlFor="ui-kit-input" className="text-sm font-semibold">기본 입력</label>
              <Input id="ui-kit-input" placeholder="키보드 포커스와 입력 상태" />
            </div>
            <div className="min-w-0 space-y-2">
              <label htmlFor="ui-kit-disabled" className="text-sm font-semibold">비활성 입력</label>
              <Input id="ui-kit-disabled" disabled defaultValue="비활성화된 값" />
            </div>
            <div className="min-w-0 space-y-2">
              <label htmlFor="ui-kit-invalid" className="text-sm font-semibold">오류 입력</label>
              <Input id="ui-kit-invalid" aria-invalid="true" aria-describedby="ui-kit-input-error" defaultValue="확인이 필요한 값" />
              <p id="ui-kit-input-error" className="text-sm text-destructive">입력 내용을 확인해주세요.</p>
            </div>
            <div className="min-w-0 space-y-2">
              <label htmlFor="ui-kit-textarea" className="text-sm font-semibold">긴 내용</label>
              <Textarea id="ui-kit-textarea" defaultValue="좁은 화면에서도 입력 내용과 포커스 표시를 확인할 수 있습니다." />
            </div>
          </div>
        </Card>
      </section>

      <section className="space-y-4" data-testid="ui-kit-status-badges">
        <h2 className="border-l-4 border-primary pl-3 text-xl font-bold sm:text-2xl">Components - Status</h2>
        <Card className="p-4 sm:p-6">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {(['brand', 'success', 'danger', 'warning', 'info', 'violet', 'neutral'] as const).map((tone) => (
              <StatusBadge key={tone} tone={tone} label={tone} />
            ))}
            <StatusBadge variant="line" tone="success" label="라인 상태" />
            <StatusBadge variant="filled" label="채움 상태" />
            <StatusBadge live tone="success" label="라이브" />
            <StatusBadge size="md" label="긴 상태 문구는 전체 내용을 title로 보존합니다" />
          </div>
        </Card>
      </section>

      <section className="space-y-4" data-testid="ui-kit-states">
        <h2 className="border-l-4 border-primary pl-3 text-xl font-bold sm:text-2xl">Components - Loading / Empty / Error</h2>
        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          <Card className="p-4 sm:p-6" aria-label="카드 로딩 표본" aria-busy="true">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </Card>
          <Card className="p-4 sm:p-6">
            <h3 className="text-xl font-bold">카드 콘텐츠 표본</h3>
            <p className="text-muted-foreground">로딩 표본과 같은 카드 여백과 간격을 사용합니다.</p>
          </Card>
          <EmptyState title="아직 표시할 내용이 없습니다" description="내용이 준비되면 여기에 표시됩니다." />
          <EmptyState tone="danger" title="내용을 불러오지 못했습니다" description="오류 표본의 색상과 긴 안내 문구를 확인합니다." />
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="border-l-4 border-primary pl-3 text-xl font-bold sm:text-2xl">Components - Dialog</h2>
        <Button data-testid="ui-kit-dialog-open" variant="outline" onClick={() => setDialogOpen(true)}>대화상자 표본 열기</Button>
        <PlainDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          title="공통 대화상자"
          description="Tab 순환, Escape 닫기, 좁은 화면과 다크모드를 확인합니다."
          contentTestId="ui-kit-dialog"
          footer={<PlainButton data-testid="ui-kit-dialog-confirm" onClick={() => setDialogOpen(false)}>확인</PlainButton>}
        >
          <label htmlFor="ui-kit-dialog-input" className="mb-2 block text-sm font-semibold">대화상자 입력</label>
          <Input id="ui-kit-dialog-input" placeholder="첫 입력 표본" />
        </PlainDialog>
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
