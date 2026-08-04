import express from 'express';
import cors from 'cors';

const app = express();

// 1. CORS - Allow your Netlify frontend
app.use(cors({ 
  origin: "https://swasap-erp.netlify.app" 
}));

app.use(express.json());

// 2. Test route so / doesn't 404
app.get('/', (req, res) => {
  res.json({ message: "Backend is running ✅" });
});

// 3. Health check
app.get('/api/health', (req, res) => {
  res.json({ ok: true, message: "API working" });
});

// TODO: Paste all your other routes here like /api/login, /api/users

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
