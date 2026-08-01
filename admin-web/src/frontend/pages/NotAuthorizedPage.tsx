import { Link } from 'react-router';
import { Button } from '../components/ui/Button';

export function NotAuthorizedPage() {
  return (
    <main className="center-page">
      <section className="center-card">
        <h1>Acceso no autorizado</h1>
        <p>Esta cuenta no tiene acceso al panel.</p>
        <Link to="/login">
          <Button type="button" variant="secondary">
            Volver al login
          </Button>
        </Link>
      </section>
    </main>
  );
}
