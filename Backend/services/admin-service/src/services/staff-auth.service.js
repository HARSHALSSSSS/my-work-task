const jwt = require('jsonwebtoken');
const Staff = require('../models/staff.model');

const JWT_SECRET = process.env.JWT_SECRET || 'speedcopy_dev_jwt_secret_change_in_production';
const JWT_EXPIRES_IN = '7d';

// Mock MFA storage (in production, use a proper OTP service like Twilio)
const mfaSessions = new Map();

class StaffAuthService {
  /**
   * Login staff member with email and password
   */
  async login(email, password, role) {
    try {
      if (!email || !password) {
        return {
          success: false,
          message: 'Email and password are required',
        };
      }

      // Find staff by email
      let staff;
      try {
        staff = await Staff.findOne({ email: email.toLowerCase() });
      } catch (dbError) {
        console.error('Database error finding staff:', dbError);
        return {
          success: false,
          message: 'Database error. Please try again.',
        };
      }

      if (!staff) {
        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Check if staff is active
      if (staff.status !== 'active') {
        return {
          success: false,
          message: 'Staff account is not active',
        };
      }

      // Check if account is locked
      if (staff.lockUntil && staff.lockUntil > new Date()) {
        return {
          success: false,
          message: 'Account is temporarily locked. Please try again later.',
        };
      }

      // Verify password (in production, use bcrypt)
      if (staff.password !== password) {
        // Increment login attempts
        try {
          staff.loginAttempts = (staff.loginAttempts || 0) + 1;
          if (staff.loginAttempts >= 5) {
            staff.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
          }
          await staff.save();
        } catch (saveError) {
          console.error('Error updating login attempts:', saveError);
        }

        return {
          success: false,
          message: 'Invalid email or password',
        };
      }

      // Reset login attempts on successful login
      staff.loginAttempts = 0;
      staff.lockUntil = null;
      try {
        await staff.save();
      } catch (saveError) {
        console.error('Error resetting login attempts:', saveError);
      }

      // Generate temporary session for MFA
      const sessionId = this.generateSessionId();
      const mfaCode = this.generateMFACode();

      mfaSessions.set(sessionId, {
        staffId: staff._id,
        email: staff.email,
        role: staff.role,
        mfaCode,
        createdAt: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      return {
        success: true,
        message: 'Login successful. Please verify MFA code.',
        sessionId,
        requiresMFA: staff.mfaEnabled,
        // In production, send MFA code via SMS/Email
        // For development, return the code
        mfaCode: process.env.NODE_ENV === 'development' ? mfaCode : undefined,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed',
        error: error.message,
      };
    }
  }

  /**
   * Verify MFA code and generate JWT token
   */
  async verifyMFA(sessionId, mfaCode) {
    try {
      const session = mfaSessions.get(sessionId);

      if (!session) {
        return {
          success: false,
          message: 'Invalid or expired session',
        };
      }

      // Check if session has expired
      if (session.expiresAt < Date.now()) {
        mfaSessions.delete(sessionId);
        return {
          success: false,
          message: 'MFA session expired',
        };
      }

      // Verify MFA code
      if (session.mfaCode !== mfaCode) {
        return {
          success: false,
          message: 'Invalid MFA code',
        };
      }

      // Get staff details
      const staff = await Staff.findById(session.staffId);

      if (!staff) {
        return {
          success: false,
          message: 'Staff not found',
        };
      }

      // Update last login
      staff.lastLogin = new Date();
      await staff.save();

      // Generate JWT token
      const token = jwt.sign(
        {
          id: staff._id,
          email: staff.email,
          role: staff.role,
          name: staff.name,
        },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES_IN }
      );

      // Clean up MFA session
      mfaSessions.delete(sessionId);

      return {
        success: true,
        message: 'MFA verified successfully',
        token,
        user: {
          id: staff._id,
          email: staff.email,
          name: staff.name,
          role: staff.role,
        },
      };
    } catch (error) {
      console.error('MFA verification error:', error);
      return {
        success: false,
        message: 'MFA verification failed',
        error: error.message,
      };
    }
  }

  /**
   * Verify JWT token
   */
  verifyToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return {
        success: true,
        data: decoded,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Invalid or expired token',
        error: error.message,
      };
    }
  }

  /**
   * Get staff by ID
   */
  async getStaffById(staffId) {
    try {
      const staff = await Staff.findById(staffId).select('-password');
      return {
        success: true,
        data: staff,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch staff',
        error: error.message,
      };
    }
  }

  /**
   * Generate random session ID
   */
  generateSessionId() {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate 6-digit MFA code
   */
  generateMFACode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }
}

module.exports = new StaffAuthService();
