const User = require('../../models/User');
const Project = require('../../models/Project');

const getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('projects')
      .select('-__v');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        projects: user.projects
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get user',
      error: error.message 
    });
  }
};

const getUserProjects = async (req, res) => {
  try {
    const projects = await Project.find({ owner: req.user.id })
      .sort({ createdAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      projects
    });
  } catch (error) {
    console.error('Get user projects error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get projects',
      error: error.message 
    });
  }
};

module.exports = { getCurrentUser, getUserProjects };
