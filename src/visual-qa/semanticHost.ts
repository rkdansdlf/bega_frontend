import { createElement, Suspense, type ReactNode } from 'react';
import { Route, Routes } from 'react-router-dom';

export type VisualQaSemanticHost =
  | 'admin-route'
  | 'outlet-route'
  | 'protected-route'
  | 'public-only-auth-route'
  | 'suspense'
  | 'table'
  | 'table-body'
  | 'table-body-row'
  | 'table-header-row';

const tableProps = {
  className: 'w-full border-collapse text-15',
  'data-vqa-semantic-host': 'table',
};

const renderScrollableTable = (children: ReactNode) => createElement(
  'div',
  {
    className: 'w-full max-w-full overflow-x-auto overscroll-x-contain',
    'data-vqa-semantic-host-container': true,
  },
  createElement('table', tableProps, children),
);

export const renderInSemanticHost = (
  node: ReactNode,
  semanticHost?: VisualQaSemanticHost,
): ReactNode => {
  if (semanticHost === undefined) return node;

  switch (semanticHost) {
    case 'admin-route':
      return createElement(
        Routes,
        null,
        createElement(Route, { path: '/admin', element: node }),
        createElement(Route, { path: '*', element: null }),
      );
    case 'outlet-route':
      return createElement(
        Routes,
        null,
        createElement(
          Route,
          { path: '/__visual-qa__', element: node },
          createElement(Route, {
            index: true,
            element: createElement(
              'div',
              {
                className: 'min-w-0 max-w-full break-words rounded-2xl border border-border bg-card p-5 text-center text-foreground [overflow-wrap:anywhere]',
                'data-testid': 'app-query-provider-outlet',
              },
              'AppQueryProvider 안의 중첩 라우트 콘텐츠입니다.',
            ),
          }),
        ),
        createElement(Route, { path: '*', element: null }),
      );
    case 'protected-route':
      return createElement(
        Routes,
        null,
        createElement(Route, { path: '/messages/:handle', element: node }),
        createElement(Route, { path: '*', element: null }),
      );
    case 'public-only-auth-route':
      return createElement(
        Routes,
        null,
        createElement(Route, { path: '/login', element: node }),
        createElement(Route, { path: '/signup', element: node }),
        createElement(Route, { path: '/password/reset', element: node }),
        createElement(Route, { path: '/password/reset/confirm', element: node }),
        createElement(Route, { path: '/account/deletion/recovery', element: node }),
        createElement(Route, { path: '*', element: null }),
      );
    case 'suspense':
      return createElement(
        Suspense,
        {
          fallback: createElement(
            'div',
            {
              className: 'flex min-h-[844px] w-[320px] items-center justify-center bg-background p-6 text-center text-foreground',
              'data-testid': 'visual-qa-lazy-route-fallback',
              role: 'status',
            },
            '라우트 화면을 불러오는 중입니다.',
          ),
        },
        node,
      );
    case 'table':
      return renderScrollableTable(node);
    case 'table-body':
      return renderScrollableTable(createElement('tbody', null, node));
    case 'table-body-row':
      return renderScrollableTable(
        createElement('tbody', null, createElement('tr', null, node)),
      );
    case 'table-header-row':
      return renderScrollableTable(
        createElement('thead', null, createElement('tr', null, node)),
      );
    default:
      throw new Error(`지원하지 않는 Visual QA semantic host: ${String(semanticHost)}`);
  }
};
