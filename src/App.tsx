// src/App.tsx
import { useEffect, useState } from 'react';
import ComparePage from './pages/ComparePage';
import MaterialsPage from './pages/MaterialsPage';
import CraftArmorPage from './pages/CraftArmorPage';
import ErrorBoundary from './components/ErrorBoundary';

type Page = 'compare' | 'materials' | 'craft';

const readHash = (): Page => {
  if (window.location.hash === '#materials') return 'materials';
  if (window.location.hash === '#craft') return 'craft';
  return 'compare';
};

export default function App() {
  const [page, setPage] = useState<Page>(readHash());

  useEffect(() => {
    const onHash = () => setPage(readHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <>
      <nav className="topnav">
        <a href="#compare" className={page === 'compare' ? 'active' : ''}>
          Сравнение
        </a>
        <a href="#materials" className={page === 'materials' ? 'active' : ''}>
          Ресурсы
        </a>
        <a href="#craft" className={page === 'craft' ? 'active' : ''}>
          Крафт доспехов
        </a>
      </nav>
      <ErrorBoundary>
        {page === 'compare' && <ComparePage />}
        {page === 'materials' && <MaterialsPage />}
        {page === 'craft' && <CraftArmorPage />}
      </ErrorBoundary>
    </>
  );
}