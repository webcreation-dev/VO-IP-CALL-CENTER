/**
 * Utilitaires pour standardiser les réponses API
 */

/**
 * Réponse de succès
 */
const success = (res, data, message = 'Succès', statusCode = 200) => {
    return res.status(statusCode).json({
      success: true,
      message,
      data,
    });
  };
  
  /**
   * Réponse de succès avec pagination
   */
  const successWithPagination = (res, data, pagination, message = 'Succès') => {
    return res.status(200).json({
      success: true,
      message,
      data,
      pagination: {
        total: pagination.total,
        page: pagination.page,
        limit: pagination.limit,
        totalPages: Math.ceil(pagination.total / pagination.limit),
      },
    });
  };
  
  /**
   * Réponse d'erreur
   */
  const error = (res, message = 'Erreur', statusCode = 500, details = null) => {
    return res.status(statusCode).json({
      success: false,
      error: message,
      ...(details && { details }),
    });
  };
  
  /**
   * Réponse de création réussie
   */
  const created = (res, data, message = 'Créé avec succès') => {
    return res.status(201).json({
      success: true,
      message,
      data,
    });
  };
  
  /**
   * Réponse sans contenu (suppression réussie)
   */
  const noContent = (res) => {
    return res.status(204).send();
  };
  
  /**
   * Réponse non trouvé
   */
  const notFound = (res, message = 'Ressource non trouvée') => {
    return res.status(404).json({
      success: false,
      error: message,
    });
  };
  
  /**
   * Réponse de conflit
   */
  const conflict = (res, message = 'Conflit de données') => {
    return res.status(409).json({
      success: false,
      error: message,
    });
  };
  
  module.exports = {
    success,
    successWithPagination,
    error,
    created,
    noContent,
    notFound,
    conflict,
  };