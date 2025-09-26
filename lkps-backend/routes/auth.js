const express = require('express');
const router = express.Router();
const { getCouchDBConnector } = require('../blockchain/couchdbConnector');

// Initialize CouchDB connector
let couchDB = null;
const initCouchDB = async () => {
  if (!couchDB) {
    couchDB = await getCouchDBConnector();
  }
  return couchDB;
};

// Fallback users for demo (will be moved to blockchain)
const fallbackUsers = [
  {
    id: 'admin',
    username: 'admin',
    password: 'admin', // In production, use hashed passwords
    role: 'admin',
    name: 'Administrator'
  },
  {
    id: 'upps1',
    username: 'upps1',
    password: 'password',
    role: 'upps',
    name: 'UPPS Teknik Informatika',
    university: 'Universitas Indonesia',
    program: 'Teknik Informatika'
  },
  {
    id: 'upps2',
    username: 'upps2', 
    password: 'password',
    role: 'upps',
    name: 'UPPS Sistem Informasi',
    university: 'Institut Teknologi Bandung',
    program: 'Sistem Informasi'
  },
  {
    id: 'asesor1',
    username: 'asesor1',
    password: 'password',
    role: 'asesor',
    name: 'Prof. Dr. Bambang Sudarmanto',
    specialization: 'Teknologi Informasi'
  }
];

// Demo login endpoint
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    let user = null;

    try {
      // Try to get user from blockchain first
      const db = await initCouchDB();
      user = await db.getUserByUsername(username);
    } catch (error) {
      console.log('Blockchain not available, using fallback users:', error.message);
      // Fallback to static users if blockchain is not available
      user = fallbackUsers.find(u => u.username === username);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username tidak ditemukan'
      });
    }

    // Check password (in production, use proper password hashing)
    if (user.password !== password && user.hashedPassword !== password) {
      return res.status(401).json({
        success: false,
        message: 'Password salah'
      });
    }

    // Check role
    if (user.role !== role) {
      return res.status(401).json({
        success: false,
        message: `Role tidak sesuai. Anda adalah ${user.role}, bukan ${role}`
      });
    }

    // Generate simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');

    // Return user data (without password)
    const { password: _, hashedPassword: __, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      message: 'Login berhasil',
      user: userWithoutPassword,
      token
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

// Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak ditemukan'
      });
    }

    // Decode simple token (in production, verify JWT)
    const decoded = Buffer.from(token, 'base64').toString();
    const [userId] = decoded.split(':');
    
    let user = null;

    try {
      // Try to get user from blockchain first
      const db = await initCouchDB();
      user = await db.getUser(userId);
    } catch (error) {
      console.log('Blockchain not available, using fallback users');
      // Fallback to static users if blockchain is not available
      user = fallbackUsers.find(u => u.id === userId);
    }
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    const { password: _, hashedPassword: __, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(401).json({
      success: false,
      message: 'Token tidak valid'
    });
  }
});

// Logout endpoint
router.post('/logout', (req, res) => {
  res.json({
    success: true,
    message: 'Logout berhasil'
  });
});

// Get all users (admin only)
router.get('/users', async (req, res) => {
  try {
    let users = [];

    try {
      // Try to get users from blockchain first
      const db = await initCouchDB();
      users = await db.getAllUsers();
    } catch (error) {
      console.log('Blockchain not available, using fallback users');
      // Fallback to static users if blockchain is not available
      users = fallbackUsers;
    }
    
    const usersWithoutPasswords = users.map(({ password, hashedPassword, ...user }) => user);
    
    res.json({
      success: true,
      users: usersWithoutPasswords
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;