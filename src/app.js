const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const createRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');

const createApp = (io) => {
  const app = express();

  // Store io instance for use in routes
  app.set('io', io);

  // Security middleware
  app.use(helmet());
  app.use(cors());

  // Compression middleware
  app.use(compression());

  // Logging middleware
  app.use(morgan('combined'));

  // Body parsing middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Routes
  app.use('/api', createRoutes(io));

  // Error handling
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

module.exports = createApp;
