import { Link } from 'react-router';
import { Button } from '../components/ui/Button';

export function NotFoundPage() {
  return (
    <main className="center-page">
      <section className="center-card">
        <h1>Página no encontrada</h1>
        <p>La ruta solicitada no existe.</p>
        <Link to="/dashboard">
          <Button type="button" variant="secondary">
            Ir al dashboard
          </Button>
        </Link>
      </section>
    </main>
  );
}
