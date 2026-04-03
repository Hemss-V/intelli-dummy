const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const ingestionRoutes = require('./routes/ingestionRoutes');
const invoiceRoutes = require('./routes/invoiceRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const scoreRoutes = require('./routes/scoreRoutes');
const graphRoutes = require('./routes/graphRoutes');
const explainRoutes = require('./routes/explainRoutes');
const retailRoutes = require('./routes/retailRoutes');

// Load environment variables
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Retail APIs (Unauthenticated for prototype demo)
app.use('/api/retail', retailRoutes);

// Main APIs (Authenticated via x-lender-id)
app.use('/api', ingestionRoutes);
app.use('/api', dashboardRoutes); // /alerts and /lender/:id/portfolio
app.use('/api/invoices', invoiceRoutes);
app.use('/api/score', scoreRoutes);
app.use('/api/graph', graphRoutes);
app.use('/api/explain', explainRoutes);
app.use('/api/identity', require('./routes/identityRoutes'));

const websocketService = require('./services/websocketService');

const PORT = Number(process.env.PORT) || 3000;

// Express 5 wires a listen() callback to server.once('error', ...), so a port conflict
// still invoked the "success" callback. Bind only on 'listening' and handle errors explicitly.
const server = app.listen(PORT);

server.once('listening', () => {
    console.log(`Server is running on port ${PORT}`);
    websocketService.init(server);
});

server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
        console.error(
            `Port ${PORT} is already in use. Stop the other Node process (e.g. another terminal running npm start) or set PORT in .env.`
        );
    } else {
        console.error('Server failed to start:', err);
    }
    process.exit(1);
});
