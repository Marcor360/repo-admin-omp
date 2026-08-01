import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

import meRoutes from './routes/me.routes';
import dashboardRoutes from './routes/dashboard.routes';
import congregationsRoutes from './routes/congregations.routes';
import usersRoutes from './routes/users.routes';
import systemRoutes from './routes/system.routes';
import announcementsRoutes from './routes/announcements.routes';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigin = process.env.ALLOWED_ORIGIN;
const publicAccessCheckPattern = /^\/api\/congregations\/[^/]+\/access-check$/;

app.use(
  cors((req, callback) => {
    // /access-check no lleva autenticación: la consume la app móvil, que puede
    // correr en un origen distinto al del panel. El resto de la API sí se
    // restringe a ALLOWED_ORIGIN.
    if (publicAccessCheckPattern.test(req.url ?? '')) {
      callback(null, { origin: true, credentials: false, methods: ['GET'] });
      return;
    }
    callback(null, {
      origin: allowedOrigin || false,
      credentials: false,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    });
  }),
);
app.use(express.json());

app.use('/api/me', meRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/congregations', congregationsRoutes);
app.use('/api/congregations/:id/users', usersRoutes);
app.use('/api/system', systemRoutes);
app.use('/api/announcements', announcementsRoutes);

if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../../dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
  });
}

app.listen(PORT);
