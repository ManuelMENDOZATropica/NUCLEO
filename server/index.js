import express from 'express';
import cors from 'cors';
import usersRouter from './routes/users.js';
import licensesRouter from './routes/licenses.js';
import { initializeData } from './lib/initializeData.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/users', usersRouter);
app.use('/api/licenses', licensesRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

initializeData()
  .then(() => {
    app.listen(PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`API server listening on port ${PORT}`);
    });
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('Failed to initialize data stores', error);
    process.exit(1);
  });
