import { lazy, Suspense, useState, type ReactNode } from 'react';

import './AdminPage.css';
import { adminTabItems, type AdminTabValue } from './admin/adminPageTabs';

const AdminPageDataRuntime = lazy(() => import('./AdminPageDataRuntime'));

type AdminPageRuntimeContentProps = {
  initialActiveTabOverride?: AdminTabValue;
  dataRuntimeOverride?: ReactNode | ((activeTab: AdminTabValue) => ReactNode);
};

export default function AdminPageRuntimeContent({
  initialActiveTabOverride,
  dataRuntimeOverride,
}: AdminPageRuntimeContentProps = {}) {
  const [activeTab, setActiveTab] = useState<AdminTabValue>(initialActiveTabOverride ?? 'users');
  const renderedDataRuntime = typeof dataRuntimeOverride === 'function'
    ? dataRuntimeOverride(activeTab)
    : dataRuntimeOverride;

  return (
    <div className="min-w-0" data-testid="admin-runtime-content">
      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/80 shadow-xl">
        <div className="border-b border-slate-800 px-3 pt-3 sm:px-6 sm:pt-6">
          <div
            className="grid w-full grid-cols-2 gap-1 rounded-xl bg-slate-800/50 p-1 sm:grid-cols-5 xl:grid-cols-10"
            role="tablist"
            aria-label="관리자 메뉴"
          >
            {adminTabItems.map((item) => {
              const { value, label, icon: Icon, activeClassName } = item;
              const isActive = activeTab === value;
              return (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  data-testid={item.testId}
                  aria-selected={isActive}
                  aria-pressed={isActive}
                  onClick={() => setActiveTab(value)}
                  className={`inline-flex min-h-11 min-w-0 items-center justify-center rounded-lg px-2 py-2 text-caption font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 sm:px-3 ${
                    isActive
                      ? activeClassName
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="mr-1.5 h-4 w-4 shrink-0" />
                  <span className="min-w-0 break-words text-center leading-tight">{label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div role="tabpanel" aria-label={`${activeTab} 관리 패널`} data-testid="admin-runtime-data-slot">
          {renderedDataRuntime !== undefined ? renderedDataRuntime : (
            <Suspense fallback={<div className="mb-6 rounded-xl border border-slate-800 bg-slate-900/70 p-6 text-center text-slate-400" style={{ marginInline: 'clamp(0.75rem, 3vw, 1.5rem)' }}>관리 데이터 로딩 중...</div>}>
              <AdminPageDataRuntime activeTab={activeTab} />
            </Suspense>
          )}
        </div>
      </div>

      <footer className="mt-10 text-center text-slate-600 text-caption">
        <p>BEGA 운영 콘솔 v2.0</p>
      </footer>
    </div>
  );
}
