const axios = require('axios');

class GitHubService {
  constructor() {
    this.clientId = process.env.GITHUB_CLIENT_ID;
    this.clientSecret = process.env.GITHUB_CLIENT_SECRET;
    this.redirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:3000/api/auth/github/callback';
  }

  getAuthorizationUrl(state) {
    const scopes = ['repo', 'read:user'];
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: scopes.join(' '),
      state: state || ''
    });
    
    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code) {
    try {
      const response = await axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: this.clientId,
          client_secret: this.clientSecret,
          code,
          redirect_uri: this.redirectUri
        },
        {
          headers: {
            Accept: 'application/json'
          }
        }
      );

      if (response.data.error) {
        throw new Error(response.data.error_description || 'Failed to exchange code for token');
      }

      return response.data.access_token;
    } catch (error) {
      console.error('Error exchanging code for token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with GitHub');
    }
  }

  async getUserProfile(accessToken) {
    try {
      const response = await axios.get('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      return {
        username: response.data.login,
        email: response.data.email,
        name: response.data.name,
        avatarUrl: response.data.avatar_url
      };
    } catch (error) {
      console.error('Error fetching GitHub user profile:', error.response?.data || error.message);
      throw new Error('Failed to fetch GitHub user profile');
    }
  }

  async getUserRepositories(accessToken) {
    try {
      const response = await axios.get('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/vnd.github.v3+json'
        },
        params: {
          sort: 'updated',
          per_page: 100
        }
      });

      return response.data.map(repo => ({
        name: repo.name,
        fullName: repo.full_name,
        private: repo.private,
        cloneUrl: repo.clone_url,
        defaultBranch: repo.default_branch,
        description: repo.description,
        language: repo.language,
        updatedAt: repo.updated_at,
        owner: repo.owner.login
      }));
    } catch (error) {
      console.error('Error fetching repositories:', error.response?.data || error.message);
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  async getRepositoryBranches(accessToken, owner, repo) {
    try {
      const response = await axios.get(
        `https://api.github.com/repos/${owner}/${repo}/branches`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            Accept: 'application/vnd.github.v3+json'
          }
        }
      );

      return response.data.map(branch => ({
        name: branch.name,
        protected: branch.protected
      }));
    } catch (error) {
      console.error('Error fetching branches:', error.response?.data || error.message);
      throw new Error('Failed to fetch repository branches');
    }
  }

  buildAuthenticatedCloneUrl(token, owner, repo) {
    return `https://${token}@github.com/${owner}/${repo}.git`;
  }
}

module.exports = new GitHubService();
