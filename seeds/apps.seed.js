require('dotenv').config();
const mongoose = require('mongoose');
const App = require('../models/App');

const sampleApps = [
  {
    name: 'n8n',
    slug: 'n8n',
    description: 'Workflow automation tool that allows you to connect various services and automate tasks',
    category: 'automation',
    logo: 'https://n8n.io/favicon.ico',
    deploymentType: 'docker',
    dockerImage: 'n8nio/n8n:latest',
    defaultPort: 5678,
    env: [
      {
        key: 'N8N_HOST',
        value: '{{DOMAIN}}',
        description: 'Public URL of the n8n instance',
        required: false
      },
      {
        key: 'N8N_PROTOCOL',
        value: 'https',
        description: 'Protocol (http or https)',
        required: false
      },
      {
        key: 'WEBHOOK_URL',
        value: '{{DOMAIN}}',
        description: 'Webhook URL for n8n',
        required: false
      },
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
        required: false
      },
      {
        key: 'N8N_BASIC_AUTH_PASSWORD',
        value: '',
        description: 'Basic auth password (leave empty to disable)',
        required: false
      }
    ],
    resources: {
      cpu: '1.0',
      memory: '512m'
    }
  },
  {
    name: 'Flowise',
    slug: 'flowise',
    description: 'Drag & drop UI to build your customized LLM flow using LangchainJS',
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
        required: false
      },
      {
        key: 'FLOWISE_PASSWORD',
        value: '',
        description: 'Admin password (leave empty for no auth)',
        required: false
      }
    ],
    resources: {
      cpu: '1.0',
      memory: '1g'
    }
  },
  {
    name: 'Uptime Kuma',
    slug: 'uptime-kuma',
    description: 'A fancy self-hosted monitoring tool',
    category: 'analytics',
    logo: 'https://uptime.kuma.pet/img/icon.svg',
    deploymentType: 'docker',
    dockerImage: 'louislam/uptime-kuma:latest',
    defaultPort: 3001,
    env: [
      {
        key: 'UPTIME_KUMA_BASE_URL',
        value: '{{DOMAIN}}',
        description: 'Public URL of the Uptime Kuma instance',
        required: true
      }
    ],
    resources: {
      cpu: '0.5',
      memory: '256m'
    }
  },
  {
    name: 'Ghost',
    slug: 'ghost',
    description: 'Professional publishing platform',
    category: 'cms',
    logo: 'https://ghost.org/favicon.ico',
    deploymentType: 'docker',
    dockerImage: 'ghost:latest',
    defaultPort: 2368,
    env: [
      {
        key: 'url',
        value: '{{DOMAIN}}',
        description: 'The full URL of your Ghost site',
        required: true
      },
      {
        key: 'NODE_ENV',
        value: 'production',
        description: 'Node environment',
        required: true
      }
    ],
    resources: {
      cpu: '1.0',
      memory: '512m'
    }
  },
  {
    name: 'Plausible Analytics',
    slug: 'plausible',
    description: 'Simple and privacy-friendly alternative to Google Analytics',
    category: 'analytics',
    logo: 'https://plausible.io/favicon.ico',
    deploymentType: 'docker',
    dockerImage: 'plausible/analytics:latest',
    defaultPort: 8000,
    env: [
      {
        key: 'BASE_URL',
        value: '{{DOMAIN}}',
        description: 'Public URL of the Plausible instance',
        required: true
      },
      {
        key: 'SECRET_KEY_BASE',
        value: '',
        description: 'Secret key for encryption (generate a random 64-char string)',
        required: true
      }
    ],
    resources: {
      cpu: '1.0',
      memory: '1g'
    }
  }
];

async function seedApps() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/cloud-deploy');
    console.log('✅ Connected to MongoDB');

    // Clear existing apps
    await App.deleteMany({});
    console.log('🗑️  Cleared existing apps');

    // Insert sample apps
    const apps = await App.insertMany(sampleApps);
    console.log(`✅ Inserted ${apps.length} sample apps`);

    apps.forEach(app => {
      console.log(`   - ${app.name} (${app.slug})`);
    });

    console.log('\n✅ Seed completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  }
}

seedApps();
