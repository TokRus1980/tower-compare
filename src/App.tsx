// src/App.tsx
import { useEffect, useState } from 'react';
import ComparePage from './pages/ComparePage';
import MaterialsPage from './pages/MaterialsPage';
import ErrorBoundary from './components/ErrorBoundary';

type Page = 'compare' | 'materials';

const readHash = (): Page =>
    window.location.hash === '#materials' ? 'materials' : 'compare';

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
                <a
                    href="#compare"
                    className={page === 'compare' ? 'active' : ''}
                >
                    Сравнение
                </a>
                <a
                    href="#materials"
                    className={page === 'materials' ? 'active' : ''}
                >
                    Ресурсы
                </a>
            </nav>
            <ErrorBoundary>
                {page === 'compare' ? <ComparePage /> : <MaterialsPage />}
            </ErrorBoundary>
        </>
    );
}