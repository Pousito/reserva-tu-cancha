
const validator = require('express-validator');
const { body, param, query, validationResult } = validator;

// Utilidades de validación
const validateRUT = (rut) => {
  if (!/^[0-9]+-[0-9kK]$/.test(rut)) return false;
  
  const [numero, dv] = rut.split('-');
  const dvCalculado = calcularDigitoVerificador(numero);
  
  return dv.toUpperCase() === dvCalculado;
};

const calcularDigitoVerificador = (numero) => {
  let suma = 0;
  let multiplicador = 2;
  
  for (let i = numero.length - 1; i >= 0; i--) {
    suma += parseInt(numero[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }
  
  const resto = suma % 11;
  const dv = 11 - resto;
  
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return dv.toString();
};

// Validadores específicos
const validateReservationInput = [
  body('nombre')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .escape(),
  
  body('telefono')
    .trim()
    .isMobilePhone('es-CL')
    .withMessage('El teléfono debe ser válido para Chile'),
  
  body('rut')
    .trim()
    .custom((value) => {
      if (!validateRUT(value)) {
        throw new Error('RUT inválido');
      }
      return true;
    }),
  
  body('email')
    .trim()
    .isEmail()
    .withMessage('Email inválido')
    .normalizeEmail(),
  
  body('cancha_id')
    .isInt({ min: 1 })
    .withMessage('ID de cancha inválido'),
  
  body('fecha')
    .isISO8601()
    .withMessage('Fecha inválida')
    .toDate(),
  
  body('hora_inicio')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de inicio inválida'),
  
  body('hora_fin')
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Hora de fin inválida'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validatePaymentInput = [
  body('monto')
    .isFloat({ min: 0 })
    .withMessage('El monto debe ser un número positivo'),
  
  body('metodo_pago')
    .isIn(['webpay', 'transferencia'])
    .withMessage('Método de pago inválido'),
  
  body('reserva_id')
    .isInt({ min: 1 })
    .withMessage('ID de reserva inválido'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

const validateAdminInput = [
  body('usuario')
    .trim()
    .isLength({ min: 3, max: 30 })
    .withMessage('Usuario debe tener entre 3 y 30 caracteres')
    .escape(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('La contraseña debe contener al menos una mayúscula, una minúscula y un número'),
  
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors.array()
      });
    }
    next();
  }
];

module.exports = {
  validateReservationInput,
  validatePaymentInput,
  validateAdminInput,
  validateRUT,
  calcularDigitoVerificador
};
