// ===== MIDDLEWARE DE PERMISOS POR ROL =====

/**
 * Middleware para verificar permisos específicos según el rol del usuario
 * @param {string[]} allowedRoles - Roles permitidos para la operación
 * @param {Object} options - Opciones adicionales de permisos
 */
const requireRolePermission = (allowedRoles, options = {}) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Usuario no autenticado' });
    }

    const userRole = req.user.rol;
    const userComplexId = req.user.complejo_id;

    // Verificar si el rol está permitido
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        success: false, 
        error: `Rol '${userRole}' no tiene permisos para esta operación` 
      });
    }

    // Super admin puede acceder a todo
    if (userRole === 'super_admin') {
      req.userPermissions = {
        canViewFinancials: true,
        canManageComplexes: true,
        canManageCourts: true,
        canViewReports: true,
        canEditReservations: true,
        complexFilter: null // Sin filtro, ve todo
      };
      return next();
    }

    // Configurar permisos para owner
    if (userRole === 'owner') {
      if (!userComplexId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Dueño no tiene complejo asignado' 
        });
      }

      req.userPermissions = {
        canViewFinancials: true,
        canManageComplexes: false, // Solo puede ver su complejo
        canManageCourts: true,
        canViewReports: true,
        canEditReservations: true,
        complexFilter: userComplexId
      };
      return next();
    }

    // Configurar permisos para manager
    if (userRole === 'manager') {
      if (!userComplexId) {
        return res.status(403).json({ 
          success: false, 
          error: 'Administrador no tiene complejo asignado' 
        });
      }

      req.userPermissions = {
        canViewFinancials: false, // No puede ver información financiera
        canManageComplexes: false,
        canManageCourts: false, // Solo puede ver canchas
        canViewReports: false,
        canEditReservations: true,
        complexFilter: userComplexId
      };
      return next();
    }

    return res.status(403).json({ 
      success: false, 
      error: 'Rol no válido' 
    });
  };
};

/**
 * Middleware para verificar acceso a información financiera
 */
const requireFinancialAccess = (req, res, next) => {
  if (!req.userPermissions || !req.userPermissions.canViewFinancials) {
    return res.status(403).json({ 
      success: false, 
      error: 'No tienes permisos para ver información financiera' 
    });
  }
  next();
};

/**
 * Middleware para verificar acceso a gestión de complejos
 */
const requireComplexManagement = (req, res, next) => {
  if (!req.userPermissions || !req.userPermissions.canManageComplexes) {
    return res.status(403).json({ 
      success: false, 
      error: 'No tienes permisos para gestionar complejos' 
    });
  }
  next();
};

/**
 * Middleware para verificar acceso a gestión de canchas
 */
const requireCourtManagement = (req, res, next) => {
  if (!req.userPermissions || !req.userPermissions.canManageCourts) {
    return res.status(403).json({ 
      success: false, 
      error: 'No tienes permisos para gestionar canchas' 
    });
  }
  next();
};

/**
 * Middleware para verificar acceso a reportes
 */
const requireReportsAccess = (req, res, next) => {
  if (!req.userPermissions || !req.userPermissions.canViewReports) {
    return res.status(403).json({ 
      success: false, 
      error: 'No tienes permisos para ver reportes' 
    });
  }
  next();
};

module.exports = {
  requireRolePermission,
  requireFinancialAccess,
  requireComplexManagement,
  requireCourtManagement,
  requireReportsAccess
};
