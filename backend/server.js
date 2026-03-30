const express = require('express');
const promClient = require('prom-client');
const winston = require('winston');
const cors = require('cors');
const net = require('net');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;
const logstashHost = process.env.LOGSTASH_HOST || '192.168.126.130';
const logstashPort = process.env.LOGSTASH_PORT || 5000;

// Enable CORS and JSON body parsing
app.use(cors());
app.use(express.json());

// --- Observability: Metrics ---
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics(); // Collect default system metrics

// Custom metric: Counter for HTTP requests
const httpRequestCounter = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests made',
  labelNames: ['method', 'route', 'status_code']
});

// Custom metric: Histogram for request duration
const httpRequestDurationMicroseconds = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// --- Observability: Logging ---
// Standard stdout format for container environments
const transports = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    )
  })
];

const logger = winston.createLogger({
  level: 'info',
  transports: transports,
  defaultMeta: { service: 'infra-test-app' }
});

// Simple TCP connection for direct Logstash shipping
const logstashClient = new net.Socket();
function connectLogstash() {
  logstashClient.connect(logstashPort, logstashHost, () => {
    logger.info('Connected to Logstash via TCP', { host: logstashHost, port: logstashPort });
  });
}

logstashClient.on('error', (err) => {
  // If we can't connect, standard output logging is still available
  console.error('[Logstash TCP] Connection error:', err.message);
  // Retry connection after delay
  setTimeout(connectLogstash, 5000);
});

// Stream winston logs directly to logstash via TCP socket
logger.on('data', (log) => {
  if (!logstashClient.pending) {
    try {
      logstashClient.write(JSON.stringify(log) + '\n');
    } catch (e) {
      console.error('[Logstash TCP] Write error:', e.message);
    }
  }
});

// Initial connection attempt (don't fail app if unavailable)
connectLogstash();

// --- Express Middleware for logs & metrics ---
app.use((req, res, next) => {
  const end = httpRequestDurationMicroseconds.startTimer();
  res.on('finish', () => {
    // Record metrics
    httpRequestCounter.labels(req.method, req.route ? req.route.path : req.path, res.statusCode).inc();
    end({ method: req.method, route: req.route ? req.route.path : req.path, status_code: res.statusCode });
    
    // Log request
    logger.info('HTTP Request', {
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ip: req.ip,
    });
  });
  next();
});





// --- Endpoints ---
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

app.get('/health', (req, res) => {
  logger.info('Health check pinged');
  res.status(200).json({ status: 'UP' });
});

// --- Simple CRUD ---
let items = [
  { id: 1, name: 'Initial setup', description: 'Configure network security groups', status: 'done' },
  { id: 2, name: 'Deploy Prometheus', description: 'Setup Prometheus for metrics scraping', status: 'pending' },
];
let nextId = 3;

// List items
app.get('/api/items', (req, res) => {
  logger.info('Retrieved items list');
  res.json(items);
});

// Create item
app.post('/api/items', (req, res) => {
  const { name, description, status } = req.body;
  if (!name) {
    logger.warn('Failed item creation: validation error');
    return res.status(400).json({ error: 'Name is required' });
  }
  const newItem = { id: nextId++, name, description, status: status || 'pending' };
  items.push(newItem);
  logger.info('Item created successfully', { itemId: newItem.id });
  res.status(201).json(newItem);
});

// Update item
app.put('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = items.findIndex(i => i.id === id);
  if (index === -1) {
    logger.warn(`Failed item update: not found`, { itemId: id });
    return res.status(404).json({ error: 'Item not found' });
  }
  
  const { name, description, status } = req.body;
  items[index] = { ...items[index], name: name || items[index].name, description: description || items[index].description, status: status || items[index].status };
  
  logger.info('Item updated successfully', { itemId: id });
  res.json(items[index]);
});

// Delete item
app.delete('/api/items/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const index = items.findIndex(i => i.id === id);
  if (index === -1) {
    logger.warn(`Failed item deletion: not found`, { itemId: id });
    return res.status(404).json({ error: 'Item not found' });
  }
  items.splice(index, 1);
  logger.info('Item deleted successfully', { itemId: id });
  res.status(204).send();
});

// --- Server Startup ---
app.listen(port, () => {
  logger.info(`Server is running on port ${port}`);
  console.log(`Backend server listening at http://localhost:${port}`);
  console.log(`Metrics endpoint available at http://localhost:${port}/metrics`);
});
