const ROLE_MAPPING = {
  'Super Admin': 'Owner',
  'Admin': 'Sr. Agent',
  'Ops Manager': 'Jr. Agent',
  'Ops Staff': 'Jr. Agent',
  'Accountant': 'Jr. Agent',
  'Viewer': 'Viewer'
};

const checkVoyagePermission = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    
    const voyageRole = ROLE_MAPPING[req.user.role] || 'Viewer';
    
    const roleLevels = { 'Owner': 4, 'Sr. Agent': 3, 'Jr. Agent': 2, 'Viewer': 1 };
    
    if (roleLevels[voyageRole] >= roleLevels[requiredRole]) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden. Insufficient Voyage permissions.' });
    }
  };
};

module.exports = { checkVoyagePermission, ROLE_MAPPING };
