import express from 'express';
import cors from 'cors';
import { leadsRouter } from './routes/leads.js';
import { draftsRouter } from './routes/drafts.js';

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/leads', leadsRouter);
app.use('/drafts', draftsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export { app };
