const recordingService = require('../services/recordingService');
const { success, created, error, notFound } = require('../utils/response');
const fs = require('fs');

/**
 * Contrôleur pour la gestion des enregistrements audio
 */
class RecordingController {
  /**
   * GET /api/recordings
   */
  async getAllRecordings(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date,
        src: req.query.src,
        dst: req.query.dst,
        page: req.query.page || 1,
        limit: req.query.limit || 50
      };

      const result = await recordingService.getAllRecordings(filters);

      return res.status(200).json({
        success: true,
        message: `${result.data.length} enregistrement(s) trouvé(s)`,
        data: result.data,
        pagination: result.pagination
      });
    } catch (err) {
      console.error('❌ Erreur getAllRecordings:', err);
      next(err);
    }
  }

  /**
   * GET /api/recordings/:id
   */
  async getRecordingById(req, res, next) {
    try {
      const { id } = req.params;
      const recording = await recordingService.getRecordingById(id);

      if (!recording) {
        return notFound(res, `Enregistrement avec l'ID ${id} introuvable`);
      }

      return success(res, recording, 'Enregistrement trouvé');
    } catch (err) {
      console.error('❌ Erreur getRecordingById:', err);
      next(err);
    }
  }

  /**
   * POST /api/recordings
   */
  async createRecording(req, res, next) {
    try {
      const data = req.body;

      if (!data.uniqueid || !data.filename || !data.filepath) {
        return error(res, 'Les champs uniqueid, filename et filepath sont requis', 400);
      }

      const recording = await recordingService.createRecording(data);
      return created(res, recording, 'Enregistrement créé avec succès');
    } catch (err) {
      console.error('❌ Erreur createRecording:', err);
      next(err);
    }
  }

  /**
   * PUT /api/recordings/:id
   */
  async updateRecording(req, res, next) {
    try {
      const { id } = req.params;
      const data = req.body;

      const recording = await recordingService.updateRecording(id, data);
      return success(res, recording, 'Enregistrement mis à jour avec succès');
    } catch (err) {
      console.error('❌ Erreur updateRecording:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * DELETE /api/recordings/:id
   */
  async deleteRecording(req, res, next) {
    try {
      const { id } = req.params;
      const recording = await recordingService.deleteRecording(id);
      return success(res, recording, 'Enregistrement supprimé avec succès');
    } catch (err) {
      console.error('❌ Erreur deleteRecording:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * GET /api/recordings/:id/download
   */
  async downloadRecording(req, res, next) {
    try {
      const { id } = req.params;
      const filepath = await recordingService.getRecordingFilePath(id);

      // Télécharger le fichier
      res.download(filepath, (err) => {
        if (err) {
          console.error('❌ Erreur téléchargement:', err);
          return error(res, 'Erreur lors du téléchargement du fichier', 500);
        }
      });
    } catch (err) {
      console.error('❌ Erreur downloadRecording:', err);

      if (err.message.includes('introuvable')) {
        return notFound(res, err.message);
      }

      next(err);
    }
  }

  /**
   * GET /api/recordings/stats
   */
  async getRecordingStats(req, res, next) {
    try {
      const filters = {
        tenant_id: req.query.tenant_id,
        start_date: req.query.start_date,
        end_date: req.query.end_date
      };

      const stats = await recordingService.getRecordingStats(filters);
      return success(res, stats, 'Statistiques des enregistrements');
    } catch (err) {
      console.error('❌ Erreur getRecordingStats:', err);
      next(err);
    }
  }
}

module.exports = new RecordingController();