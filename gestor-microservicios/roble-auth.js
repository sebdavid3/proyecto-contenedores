const axios = require('axios');

// ROBLE Configuration
const ROBLE_BASE_HOST = process.env.ROBLE_BASE_HOST || 'https://roble-api.openlab.uninorte.edu.co';
const ROBLE_CONTRACT = process.env.ROBLE_CONTRACT || 'pc2_3e6afe53f1';

/**
 * Login to ROBLE with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - User data with accessToken
 */
async function robleLogin(email, password) {
  try {
    const url = `${ROBLE_BASE_HOST}/auth/${ROBLE_CONTRACT}/login`;
    const response = await axios.post(url, { email, password }, { timeout: 10000 });
    
    if (response.status === 200 || response.status === 201) {
      const data = response.data;
      // ROBLE returns 'accessToken', normalize to 'token'
      if (data.accessToken) {
        data.token = data.accessToken;
      }
      return { success: true, data };
    }
    
    return { success: false, error: 'Login failed' };
  } catch (error) {
    console.error('ROBLE Login Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Login failed'
    };
  }
}

/**
 * Verify if a token is valid
 * @param {string} token - JWT token to verify
 * @returns {Promise<boolean>} - True if valid, false otherwise
 */
async function robleVerifyToken(token) {
  try {
    const url = `${ROBLE_BASE_HOST}/auth/${ROBLE_CONTRACT}/verify-token`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    
    return response.status === 200;
  } catch (error) {
    console.error('ROBLE Verify Token Error:', error.response?.status || error.message);
    return false;
  }
}

/**
 * Get user information from token
 * @param {string} token - JWT token
 * @returns {Promise<Object>} - User data
 */
async function robleGetUserInfo(token) {
  try {
    const url = `${ROBLE_BASE_HOST}/auth/${ROBLE_CONTRACT}/verify-token`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    
    if (response.status === 200) {
      return { success: true, data: response.data };
    }
    
    return { success: false, error: 'Failed to get user info' };
  } catch (error) {
    console.error('ROBLE Get User Info Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to get user info'
    };
  }
}

/**
 * Check if user has permissions for an action
 * @param {string} token - JWT token
 * @param {string} action - Action to check (create, delete, read)
 * @returns {Promise<Object>} - Permission result with user info
 */
async function robleCheckPermissions(token, action = 'read') {
  try {
    const userInfoResult = await robleGetUserInfo(token);
    
    if (!userInfoResult.success) {
      return { allowed: false, error: 'Invalid token' };
    }
    
    const userData = userInfoResult.data;
    const userInfo = userData.user || userData;
    const userRole = userInfo.role || 'user';
    const userEmail = userInfo.email || '';
    
    // Permission logic
    if (action === 'create' || action === 'delete') {
      // Only admins or @uninorte.edu.co emails can create/delete
      const isAdmin = userRole === 'admin' || userEmail.includes('@uninorte.edu.co');
      return {
        allowed: isAdmin,
        user: userInfo,
        role: userRole,
        reason: isAdmin ? 'Authorized' : 'Admin privileges required'
      };
    } else {
      // Read access for all authenticated users
      return {
        allowed: true,
        user: userInfo,
        role: userRole,
        reason: 'Authorized'
      };
    }
  } catch (error) {
    console.error('ROBLE Check Permissions Error:', error.message);
    return {
      allowed: false,
      error: error.message || 'Permission check failed'
    };
  }
}

/**
 * Query a table from ROBLE database
 * @param {string} token - JWT token
 * @param {string} tableName - Name of the table to query
 * @param {Object} filters - Optional filters as query parameters
 * @returns {Promise<Object>} - Query result
 */
async function robleQueryTable(token, tableName, filters = {}) {
  try {
    const url = `${ROBLE_BASE_HOST}/database/${ROBLE_CONTRACT}/read`;
    const params = { tableName, ...filters };
    
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      params,
      timeout: 10000
    });
    
    if (response.status === 200) {
      return { success: true, data: response.data };
    }
    
    return { success: false, error: 'Query failed' };
  } catch (error) {
    console.error('ROBLE Query Table Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || `Error querying ROBLE: ${error.message}`
    };
  }
}

/**
 * Insert data into a ROBLE table
 * @param {string} token - JWT token
 * @param {string} tableName - Name of the table
 * @param {Object} data - Data to insert
 * @returns {Promise<Object>} - Insert result
 */
async function robleInsertData(token, tableName, data) {
  try {
    const url = `${ROBLE_BASE_HOST}/database/${ROBLE_CONTRACT}/create`;
    
    const response = await axios.post(url, {
      tableName,
      data
    }, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    
    if (response.status === 200 || response.status === 201) {
      return { success: true, data: response.data };
    }
    
    return { success: false, error: 'Insert failed' };
  } catch (error) {
    console.error('ROBLE Insert Data Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Insert failed'
    };
  }
}

/**
 * Update data in a ROBLE table
 * @param {string} token - JWT token
 * @param {string} tableName - Name of the table
 * @param {string} id - Record ID
 * @param {Object} data - Data to update
 * @returns {Promise<Object>} - Update result
 */
async function robleUpdateData(token, tableName, id, data) {
  try {
    const url = `${ROBLE_BASE_HOST}/database/${ROBLE_CONTRACT}/update`;
    
    const response = await axios.put(url, {
      tableName,
      id,
      data
    }, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10000
    });
    
    if (response.status === 200) {
      return { success: true, data: response.data };
    }
    
    return { success: false, error: 'Update failed' };
  } catch (error) {
    console.error('ROBLE Update Data Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Update failed'
    };
  }
}

/**
 * Delete data from a ROBLE table
 * @param {string} token - JWT token
 * @param {string} tableName - Name of the table
 * @param {string} id - Record ID
 * @returns {Promise<Object>} - Delete result
 */
async function robleDeleteData(token, tableName, id) {
  try {
    const url = `${ROBLE_BASE_HOST}/database/${ROBLE_CONTRACT}/delete`;
    
    const response = await axios.delete(url, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tableName, id },
      timeout: 10000
    });
    
    if (response.status === 200) {
      return { success: true, data: response.data };
    }
    
    return { success: false, error: 'Delete failed' };
  } catch (error) {
    console.error('ROBLE Delete Data Error:', error.response?.data || error.message);
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Delete failed'
    };
  }
}

// Middleware for Express to verify ROBLE authentication
function robleAuthMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required',
      message: 'Please provide a valid ROBLE token'
    });
  }
  
  const token = authHeader.split(' ')[1];
  
  robleVerifyToken(token)
    .then(isValid => {
      if (isValid) {
        req.robleToken = token;
        next();
      } else {
        res.status(401).json({
          success: false,
          error: 'Invalid token',
          message: 'Your ROBLE token is invalid or expired'
        });
      }
    })
    .catch(error => {
      res.status(500).json({
        success: false,
        error: 'Authentication verification failed',
        message: error.message
      });
    });
}

// Middleware for Express to check permissions
function roblePermissionMiddleware(action) {
  return async (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      const permissionResult = await robleCheckPermissions(token, action);
      
      if (permissionResult.allowed) {
        req.robleUser = permissionResult.user;
        req.robleRole = permissionResult.role;
        next();
      } else {
        res.status(403).json({
          success: false,
          error: 'Permission denied',
          message: permissionResult.reason || 'You do not have permission to perform this action'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Permission check failed',
        message: error.message
      });
    }
  };
}

module.exports = {
  ROBLE_BASE_HOST,
  ROBLE_CONTRACT,
  robleLogin,
  robleVerifyToken,
  robleGetUserInfo,
  robleCheckPermissions,
  robleQueryTable,
  robleInsertData,
  robleUpdateData,
  robleDeleteData,
  robleAuthMiddleware,
  roblePermissionMiddleware
};
