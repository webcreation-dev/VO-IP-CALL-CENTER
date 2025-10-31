/**
 * Middleware de validation générique
 */
const validate = (schema) => {
    return (req, res, next) => {
      const { error } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
      });
  
      if (error) {
        const errors = error.details.map((detail) => ({
          field: detail.path.join('.'),
          message: detail.message,
        }));
  
        return res.status(400).json({
          success: false,
          error: 'Erreur de validation',
          details: errors,
        });
      }
  
      next();
    };
  };
  
  /**
   * Validation manuelle simple (sans Joi pour l'instant)
   */
  const validateRequired = (fields) => {
    return (req, res, next) => {
      const missing = [];
  
      fields.forEach((field) => {
        if (!req.body[field]) {
          missing.push(field);
        }
      });
  
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          error: 'Champs requis manquants',
          details: missing,
        });
      }
  
      next();
    };
  };
  
  module.exports = { validate, validateRequired };