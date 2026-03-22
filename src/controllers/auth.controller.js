const { clerkClient } = require('@clerk/clerk-sdk-node');
const User = require('../../models/User');

const syncUser = async (req, res) => {
  try {
    const { clerkId } = req.body;

    if (!clerkId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Clerk ID is required' 
      });
    }

    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkId);

    // Find or create user in database
    let user = await User.findOne({ clerkId: clerkUser.id });

    if (!user) {
      user = await User.create({
        clerkId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        name: `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim()
      });
    } else {
      // Update user info if changed
      user.email = clerkUser.emailAddresses[0]?.emailAddress;
      user.name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
      await user.save();
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        clerkId: user.clerkId,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Sync user error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to sync user',
      error: error.message 
    });
  }
};

module.exports = { syncUser };
