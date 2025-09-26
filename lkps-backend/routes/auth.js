const express = require('express');
const router = express.Router();

// Mock users database - dalam implementasi nyata ini akan menggunakan blockchain atau database
const users = [
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
router.post('/login', (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Find user by username
    const user = users.find(u => u.username === username);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Username tidak ditemukan'
      });
    }

    // Check password
    if (user.password !== password) {
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
    const { password: _, ...userWithoutPassword } = user;
    
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
router.get('/profile', (req, res) => {
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
    
    const user = users.find(u => u.id === userId);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token tidak valid'
      });
    }

    const { password: _, ...userWithoutPassword } = user;
    
    res.json({
      success: true,
      user: userWithoutPassword
    });
  } catch (error) {
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
router.get('/users', (req, res) => {
  try {
    const usersWithoutPasswords = users.map(({ password, ...user }) => user);
    
    res.json({
      success: true,
      users: usersWithoutPasswords
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
});

module.exports = router;