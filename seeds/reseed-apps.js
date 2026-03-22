require('dotenv').config();
const mongoose = require('mongoose');
const App = require('../models/App');

const updatedApps = [
  {
    name: 'n8n',
    slug: 'n8n',
    description: 'Workflow automation tool that allows you to connect various services and automate tasks. Perfect for building complex workflows without code.',
    category: 'automation',
    logo: 'https://n8n.io/favicon.ico',
    deploymentType: 'docker',
    dockerImage: 'n8nio/n8n:latest',
    defaultPort: 5678,
    env: [
      {
        key: 'N8N_BASIC_AUTH_ACTIVE',
        value: 'true',
        description: 'Enable basic authentication',
        required: false
      },
      {
        key: 'N8N_BASIC_AUTH_USER',
        value: 'admin',
        description: 'Basic auth username',
        required: true
      },
      {
        key: 'N8N_BASIC_AUTH_PASSWORD',
        value: '',
        description: 'Basic auth password',
        required: true
      }
    ],
    resources: {
      cpu: '1.0',
      memory: '512m'
    },
    isActive: true
  },
  {
    name: 'Flowise',
    slug: 'flowise',
    description: 'Drag & drop UI to build your customized LLM flow using LangchainJS. Create AI applications visually.',
    category: 'ai',
    logo: 'https://flowiseai.com/favicon.ico',
    deploymentType: 'docker',
    dockerImage: 'flowiseai/flowise:latest',
    defaultPort: 3000,
    env: [
      {
        key: 'FLOWISE_USERNAME',
        value: 'admin',
        description: 'Admin username',
        required: true
      },
      {
        key: 'FLOWISE_PASSWORD',
        value: '',
        description: 'Admin password',
        required: true
      }
    ],
    resources: {
      cpu: '1.0',
      memory: '1g'
    },
    isActive: true
  },
  {
    name: 'Uptime Kuma',
    slug: 'uptime-kuma',
    description: 'A fancy self-hosted monitoring tool. Monitor your websites, APIs, and services with beautiful dashboards.',
    category: 'analytics',
    logo: 'https://uptime.kuma.pet/img/icon.svg',
    deploymentType: 'docker',
    dockerImage: 'louislam/uptime-kuma:latest',
    defaultPort: 3001,
    env: [],
    resources: {
      cpu: '0.5',
      memory: '256m'
    },
    isActive: true
  },
  {
    name: 'Ghost',
    slug: 'ghost',
    description: 'Professional publishing platform. Create a beautiful blog or publication with a modern editor.',
    category: 'cms',
    logo: 'https://ghost.org/favicon.ico',
    deploymentType: 'docker',
    dockerImage: 'ghost:latest',
    defaultPort: 2368,
    env: [
      {
        key: 'url',
        value: '',
        description: 'The URL of your site (will be auto-filled with your subdomain)',
        required: false
      }
    ],
    resources: {
      cpu: '1.0',
      memory: '512m'
    },
    isActive: true
  },
  {
    name: 'Plausible Analytics',
    slug: 'plausible',
    description: 'Simple and privacy-friendly alternative to Google Analytics. No cookies, fully compliant with GDPR.',
    category: 'analytics',
    logo: 'https://plausible.io/favicon.ico',
    deploymentType: 'docker',
    dockerImage: 'plausible/analytics:latest',
    defaultPort: 8000,
    env: [
      {
        key: 'SECRET_KEY_BASE',
        value: '',
        description: 'Secret key for encryption (generate a random 64-character string)',
        required: true
      },
      {
        key: 'BASE_URL',
        value: '',
        description: 'Base URL of your instance (will be auto-filled)',
        required: false
      }
    ],
    resources: {
      cpu: '1.0',
      memory: '1g'
    },
    isActive: true
  }
];

async function reseedApps() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy');
    console.log('✅ Connected to MongoDB');

    // Get existing apps count
    const existingCount = await App.countDocuments();
    console.log(`📊 Found ${existingCount} existing apps`);

    // Clear existing apps
    if (existingCount > 0) {
      await App.deleteMany({});
      console.log('🗑️  Cleared existing apps');
    }

    // Insert updated apps
    const apps = await App.insertMany(updatedApps);
    console.log(`✅ Inserted ${apps.length} updated apps\n`);

    apps.forEach(app => {
      console.log(`   ✓ ${app.name} (${app.slug})`);
      console.log(`     Category: ${app.category}`);
      console.log(`     Image: ${app.dockerImage}`);
      console.log(`     Resources: ${app.resources.cpu} CPU, ${app.resources.memory} RAM`);
      console.log(`     Env vars: ${app.env.length}`);
      console.log('');
    });

    console.log('='.repeat(60));
    console.log('✅ Reseed completed successfully!');
    console.log('='.repeat(60));
    console.log(`Total apps: ${apps.length}`);
    console.log(`All apps are active and ready for deployment`);
    console.log('='.repeat(60));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Reseed failed:', error);
    process.exit(1);
  }
}

reseedApps();
