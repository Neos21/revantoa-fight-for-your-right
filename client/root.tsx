import { type ReactElement, type ReactNode } from 'react';
import { isRouteErrorResponse, Links, Outlet, Scripts, ScrollRestoration } from 'react-router';

import { isEmpty } from '../shared/helpers/is-empty';

import type { Route } from './+types/root';

import './styles.css';

export function Layout({ children }: { children: ReactNode }): ReactElement {
  return (
    <html lang="ja">
      <head>
        <meta charSet="UTF-8" />
        <title>Fight For Your Right</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#ff0099" />
        <meta name="description" content="Fight For Your Right" />
        <meta name="keywords" content="Fight For Your Right" />
        <meta name="robots" content="index, follow" />
        
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Fight For Your Right" />
        <meta property="og:title" content="Fight For Your Right" />
        <meta property="og:description" content="Fight For Your Right" />
        <meta property="og:url" content="https://fight-for-your-right.revantoa.workers.dev" />
        <meta property="og:image" content="https://fight-for-your-right.revantoa.workers.dev/icon-512.png" />
        <meta property="og:locale" content="ja_JP" />
        
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Fight For Your Right" />
        <meta property="twitter:description" content="Fight For Your Right" />
        <meta property="twitter:url" content="https://fight-for-your-right.revantoa.workers.dev" />
        <meta property="twitter:image" content="https://fight-for-your-right.revantoa.workers.dev/icon-512.png" />
        
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.webmanifest" />
        
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=M+PLUS+1+Code:wght@500&amp;display=swap" fetchPriority="high" />
        <link rel="stylesheet"         href="https://fonts.googleapis.com/css2?family=M+PLUS+1+Code:wght@500&amp;display=swap" fetchPriority="high" />
        
        <link rel="preconnect" href="https://challenges.cloudflare.com" />
        <link rel="preconnect" href="https://static.cloudflareinsights.com" />
        
        <Links />
        
        <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token" : "f448d7f15c19452ebc183af086aa25ec"}' />
      </head>
      <body suppressHydrationWarning>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App(): ReactElement {
  return (<Outlet />);
}

export function HydrateFallback(): ReactElement {
  return (<></>);
}

export function ErrorBoundary({ error }: Route.ErrorBoundaryProps): ReactElement {
  let title = 'エラー';
  let text = 'エラーが発生しました';
  if(isRouteErrorResponse(error)) {
    if(error.status === 404) {
      title = '404';
      text  = 'ページが見つかりませんでした';
    }
    if(!isEmpty(error.statusText)) text = error.statusText;
  }
  
  return (
    <>
      <h1>{title}</h1>
      <p>{text}</p>
    </>
  );
}
