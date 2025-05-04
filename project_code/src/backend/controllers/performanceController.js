// backend/controllers/performanceController.js
import Performance from "../models/performanceModel.js";
import Employee from "../models/employeeModel.js";

/**
 * Récupère toutes les évaluations de performance d'un utilisateur (tenant)
 */
export const getPerformances = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId; // Get tenantId from authenticated user
    const { employeeId, period, startDate, endDate } = req.query;

    const query = { tenantId };

    // Filtrer par employé si spécifié
    if (employeeId) {
      query.employeeId = employeeId;
    }

    // Filtrer par période si spécifié
    if (period) {
      query.period = period;
    }

    // Filtrer par date si spécifié
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const performances = await Performance.find(query).sort({ date: -1 });

    // Enrichir les données avec les informations des employés
    const employeeIds = performances.map(p => p.employeeId);
    const employees = await Employee.find({ _id: { $in: employeeIds } }).select("firstName lastName position");
    const employeeMap = employees.reduce((map, emp) => {
      map[emp._id.toString()] = emp;
      return map;
    }, {});

    const enrichedPerformances = performances.map(performance => {
      const employee = employeeMap[performance.employeeId.toString()];
      return {
        ...performance.toObject(),
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu',
        employeePosition: employee ? employee.position : ''
      };
    });

    return res.json(enrichedPerformances);
  } catch (error) {
    console.error('Erreur dans getPerformances:', error);
    return next(error);
  }
};

/**
 * Récupère une évaluation de performance spécifique
 */
export const getPerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const performance = await Performance.findOne({ _id: id, tenantId }); // Ensure tenant isolation

    if (!performance) {
      return res.status(404).json({ message: 'Évaluation de performance non trouvée' });
    }

    // Enrichir avec les informations de l'employé
    const employee = await Employee.findById(performance.employeeId).select("firstName lastName position");
    const enrichedPerformance = {
      ...performance.toObject(),
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu',
      employeePosition: employee ? employee.position : ''
    };

    return res.json(enrichedPerformance);
  } catch (error) {
    console.error('Erreur dans getPerformance:', error);
    return next(error);
  }
};

/**
 * Crée une nouvelle évaluation de performance
 */
export const createPerformance = async (req, res, next) => {
  try {
    const userId = req.user.id; // Creator ID
    const tenantId = req.user.tenantId;
    const {
      employeeId, date, period, metrics, overallRating,
      strengths, areasForImprovement, goals, feedback, reviewedBy
    } = req.body;

    if (!employeeId || !metrics || overallRating === undefined) {
      return res.status(400).json({ message: 'Informations incomplètes (employé, métriques, note globale requis)' });
    }

    // Vérifier que l'employé existe et appartient au tenant
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé ou n\"appartient pas à votre organisation' });
    }

    const newPerformance = new Performance({
      userId, // ID of the user creating the review (manager/admin)
      tenantId,
      employeeId,
      date: date || new Date(),
      period: period || 'mensuel', // Default period if not provided
      metrics,
      overallRating,
      strengths: strengths || [],
      areasForImprovement: areasForImprovement || [],
      goals: goals || [],
      feedback,
      reviewedBy: reviewedBy || userId, // Default reviewer is the creator
      acknowledgement: { acknowledged: false } // Default not acknowledged
    });

    const savedPerformance = await newPerformance.save();

    // Enrichir la réponse avec les informations de l'employé
    const enrichedPerformance = {
      ...savedPerformance.toObject(),
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeePosition: employee.position
    };

    return res.status(201).json(enrichedPerformance);
  } catch (error) {
    console.error('Erreur dans createPerformance:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Erreur de validation', errors: error.errors });
    }
    return next(error);
  }
};

/**
 * Met à jour une évaluation de performance existante
 */
export const updatePerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const updates = req.body;

    // Find the performance review ensuring it belongs to the tenant
    const performance = await Performance.findOne({ _id: id, tenantId });
    if (!performance) {
      return res.status(404).json({ message: 'Évaluation de performance non trouvée' });
    }

    // Prevent changing tenantId or userId directly
    delete updates.tenantId;
    delete updates.userId;
    // EmployeeId should likely not be changed in an update, handle if necessary
    delete updates.employeeId;

    const updatedPerformance = await Performance.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    // Enrichir la réponse avec les informations de l'employé
    const employee = await Employee.findById(updatedPerformance.employeeId).select("firstName lastName position");
    const enrichedPerformance = {
      ...updatedPerformance.toObject(),
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu',
      employeePosition: employee ? employee.position : ''
    };

    return res.json(enrichedPerformance);
  } catch (error) {
    console.error('Erreur dans updatePerformance:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Erreur de validation', errors: error.errors });
    }
    return next(error);
  }
};

/**
 * Supprime une évaluation de performance
 */
export const deletePerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const performance = await Performance.findOneAndDelete({ _id: id, tenantId });
    if (!performance) {
      return res.status(404).json({ message: 'Évaluation de performance non trouvée' });
    }

    return res.json({ message: 'Évaluation de performance supprimée avec succès' });
  } catch (error) {
    console.error('Erreur dans deletePerformance:', error);
    return next(error);
  }
};

/**
 * Marque une évaluation comme reconnue par l'employé
 * Note: This might need more specific authorization logic (e.g., only the employee can acknowledge)
 */
export const acknowledgePerformance = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    // Assuming the logged-in user (req.user.id) should match the employeeId for acknowledgement
    // Or, perhaps a manager can acknowledge on behalf? Clarify logic.

    const performance = await Performance.findOne({ _id: id, tenantId });
    if (!performance) {
      return res.status(404).json({ message: 'Évaluation de performance non trouvée' });
    }

    // Add authorization check if needed: e.g., is the logged-in user the employee?
    // if (req.user.id !== performance.employeeId.toString()) {
    //   return res.status(403).json({ message: 'Non autorisé à accuser réception de cette évaluation' });
    // }

    if (performance.acknowledgement && performance.acknowledgement.acknowledged) {
        return res.status(400).json({ message: 'Évaluation déjà marquée comme reçue.' });
    }

    performance.acknowledgement = {
      acknowledged: true,
      date: new Date(),
      acknowledgedBy: req.user.id // Record who acknowledged it
    };

    const updatedPerformance = await performance.save();

    // Enrichir la réponse avec les informations de l'employé
    const employee = await Employee.findById(updatedPerformance.employeeId).select("firstName lastName position");
    const enrichedPerformance = {
      ...updatedPerformance.toObject(),
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu',
      employeePosition: employee ? employee.position : ''
    };

    return res.json(enrichedPerformance);
  } catch (error) {
    console.error('Erreur dans acknowledgePerformance:', error);
    return next(error);
  }
};

/**
 * Génère un rapport de performance pour un employé
 */
export const generatePerformanceReport = async (req, res, next) => {
  try {
    const { employeeId } = req.params; // Employee ID from URL
    const tenantId = req.user.tenantId;
    const { startDate, endDate, period } = req.query;

    // Vérifier que l'employé existe et appartient au tenant
    const employee = await Employee.findOne({ _id: employeeId, tenantId }).select("firstName lastName position");
    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé ou n\"appartient pas à votre organisation' });
    }

    const query = { employeeId, tenantId };

    // Filtrer par période si spécifié
    if (period) {
      query.period = period;
    }

    // Filtrer par date si spécifié
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const performances = await Performance.find(query).sort({ date: -1 });

    if (performances.length === 0) {
      return res.status(404).json({ message: 'Aucune évaluation trouvée pour cet employé dans la période spécifiée' });
    }

    // --- Report Generation Logic --- (Simplified example)
    let totalOverallRating = 0;
    const metricsSum = { productivity: 0, quality: 0, reliability: 0, teamwork: 0, initiative: 0 };
    let metricsCount = 0;
    const allStrengths = [];
    const allAreasForImprovement = [];

    performances.forEach(perf => {
      if (perf.overallRating !== undefined) {
        totalOverallRating += perf.overallRating;
      }
      if (perf.metrics) {
          metricsCount++; // Count performances with metrics
          Object.keys(metricsSum).forEach(key => {
              if (perf.metrics[key] !== undefined) {
                  metricsSum[key] += perf.metrics[key];
              }
          });
      }
      if (perf.strengths) allStrengths.push(...perf.strengths);
      if (perf.areasForImprovement) allAreasForImprovement.push(...perf.areasForImprovement);
    });

    const count = performances.length;
    const averageOverallRating = count > 0 ? totalOverallRating / count : 0;
    const averageMetrics = {};
    if (metricsCount > 0) {
        Object.keys(metricsSum).forEach(key => {
            averageMetrics[key] = metricsSum[key] / metricsCount;
        });
    }

    // Frequency analysis for strengths and areas
    const strengthsCount = allStrengths.reduce((acc, strength) => {
        acc[strength] = (acc[strength] || 0) + 1;
        return acc;
    }, {});
    const areasCount = allAreasForImprovement.reduce((acc, area) => {
        acc[area] = (acc[area] || 0) + 1;
        return acc;
    }, {});

    const topStrengths = Object.entries(strengthsCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([strength, count]) => ({ strength, count }));
    const topAreas = Object.entries(areasCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([area, count]) => ({ area, count }));

    // Progression analysis (simplified: first vs last)
    let progression = null;
    if (performances.length >= 2) {
      const sortedPerformances = [...performances].sort((a, b) => new Date(a.date) - new Date(b.date));
      const firstPerf = sortedPerformances[0];
      const lastPerf = sortedPerformances[sortedPerformances.length - 1];
      if (firstPerf.overallRating !== undefined && lastPerf.overallRating !== undefined) {
          const change = lastPerf.overallRating - firstPerf.overallRating;
          progression = {
              startDate: firstPerf.date,
              endDate: lastPerf.date,
              startRating: firstPerf.overallRating,
              endRating: lastPerf.overallRating,
              change: change,
              // Avoid division by zero if startRating is 0
              percentChange: firstPerf.overallRating !== 0 ? (change / firstPerf.overallRating) * 100 : null
          };
      }
    }

    return res.json({
      employee: {
        id: employee._id,
        firstName: employee.firstName,
        lastName: employee.lastName,
        position: employee.position
      },
      reportPeriod: {
        start: startDate ? new Date(startDate).toISOString() : (performances.length > 0 ? performances[performances.length - 1].date.toISOString() : null),
        end: endDate ? new Date(endDate).toISOString() : (performances.length > 0 ? performances[0].date.toISOString() : null),
        evaluationsCount: count
      },
      summary: {
          averageOverallRating: averageOverallRating.toFixed(2),
          averageMetrics: Object.fromEntries(Object.entries(averageMetrics).map(([k, v]) => [k, v.toFixed(2)])),
          topStrengths,
          topAreasForImprovement: topAreas,
          progression
      },
      // Optionally include recent evaluations details
      // recentEvaluations: performances.slice(0, 3).map(p => ({ date: p.date, overallRating: p.overallRating, feedback: p.feedback }))
    });
  } catch (error) {
    console.error('Erreur dans generatePerformanceReport:', error);
    return next(error);
  }
};

