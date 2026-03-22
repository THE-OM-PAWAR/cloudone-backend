const crypto = require('crypto');
const githubDeployService = require('../services/githubDeploy.service');
const Project = require('../../models/Project');

class WebhookController {
  /**
   * Handle GitHub webhook events for auto-deployment
   * Configure webhook in GitHub repo settings:
   * - Payload URL: https://your-domain.com/api/webhooks/github
   * - Content type: application/json
   * - Secret: Set in GITHUB_WEBHOOK_SECRET env var
   * - Events: Just the push event
   */
  async handleGitHubWebhook(req, res) {
    try {
      // Verify webhook signature
      const signature = req.headers['x-hub-signature-256'];
      const secret = process.env.GITHUB_WEBHOOK_SECRET;

      if (secret && signature) {
        const hmac = crypto.createHmac('sha256', secret);
        const digest = 'sha256=' + hmac.update(JSON.stringify(req.body)).digest('hex');
        
        if (signature !== digest) {
          return res.status(401).json({
            success: false,
            message: 'Invalid signature'
          });
        }
      }

      const event = req.headers['x-github-event'];
      const payload = req.body;

      // Handle push events
      if (event === 'push') {
        const repoFullName = payload.repository.full_name;
        const [repoOwner, repoName] = repoFullName.split('/');
        const branch = payload.ref.replace('refs/heads/', '');

        console.log(`Webhook: Push to ${repoFullName} on branch ${branch}`);

        // Find projects that match this repository and branch
        const projects = await Project.find({
          repoOwner,
          repoName,
          branch,
          status: 'deployed'
        }).populate('owner');

        if (projects.length === 0) {
          return res.json({
            success: true,
            message: 'No matching projects found for auto-deployment'
          });
        }

        // Trigger redeployment for each matching project
        const io = req.app.get('io');
        
        for (const project of projects) {
          console.log(`Auto-deploying project: ${project.name}`);
          
          // Redeploy asynchronously
          githubDeployService.deployRepository(
            project.userId,
            { repoOwner, repoName, branch },
            io
          ).catch(error => {
            console.error(`Auto-deployment failed for ${project.name}:`, error);
          });
        }

        return res.json({
          success: true,
          message: `Triggered redeployment for ${projects.length} project(s)`
        });
      }

      // Acknowledge other events
      res.json({
        success: true,
        message: `Webhook event '${event}' received`
      });

    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Webhook processing failed',
        error: error.message
      });
    }
  }

  /**
   * Test endpoint to verify webhook is accessible
   */
  async testWebhook(req, res) {
    res.json({
      success: true,
      message: 'Webhook endpoint is accessible',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = new WebhookController();
