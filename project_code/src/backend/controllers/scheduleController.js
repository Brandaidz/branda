// backend/controllers/scheduleController.js
import Schedule from "../models/scheduleModel.js";
import Employee from "../models/employeeModel.js";

/**
 * Récupère tous les plannings d'un utilisateur
 */
export const getSchedules = async (req, res, next) => {
  try {
    // Note: Assuming userId comes from authenticated user (req.user) or tenant context, not URL params for security.
    const userId = req.user.id; // Or derive from tenant context
    const { startDate, endDate, employeeId } = req.query;

    const query = { tenantId: req.user.tenantId }; // Assuming tenantId is on req.user

    // Filtrer par date si spécifié
    if (startDate) query.startDate = { $gte: new Date(startDate) };
    if (endDate) query.endDate = { $lte: new Date(endDate) }; // Corrected: should be endDate

    // Filtrer par employé si spécifié
    if (employeeId) {
      query.employeeId = employeeId;
    }

    const schedules = await Schedule.find(query).sort({ startDate: 1 });

    // Enrichir les données avec les informations des employés
    const employeeIds = schedules.map(s => s.employeeId);
    const employees = await Employee.find({ _id: { $in: employeeIds } }).select("firstName lastName position");
    const employeeMap = employees.reduce((map, emp) => {
      map[emp._id.toString()] = emp;
      return map;
    }, {});

    const enrichedSchedules = schedules.map(schedule => {
      const employee = employeeMap[schedule.employeeId.toString()];
      return {
        ...schedule.toObject(),
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu',
        employeePosition: employee ? employee.position : ''
      };
    });

    return res.json(enrichedSchedules);
  } catch (error) {
    console.error('Erreur dans getSchedules:', error);
    return next(error);
  }
};

/**
 * Récupère un planning spécifique
 */
export const getSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const schedule = await Schedule.findOne({ _id: id, tenantId: req.user.tenantId }); // Ensure tenant isolation

    if (!schedule) {
      return res.status(404).json({ message: 'Planning non trouvé' });
    }

    // Enrichir avec les informations de l'employé
    const employee = await Employee.findById(schedule.employeeId).select("firstName lastName position");
    const enrichedSchedule = {
      ...schedule.toObject(),
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu',
      employeePosition: employee ? employee.position : ''
    };

    return res.json(enrichedSchedule);
  } catch (error) {
    console.error('Erreur dans getSchedule:', error);
    return next(error);
  }
};

/**
 * Crée un nouveau planning
 */
export const createSchedule = async (req, res, next) => {
  try {
    const userId = req.user.id; // Get userId from authenticated user
    const tenantId = req.user.tenantId; // Get tenantId from authenticated user
    const {
      employeeId, startDate, endDate, title, description,
      type, status, recurrence, notes
    } = req.body;

    if (!employeeId || !startDate || !endDate || !title) {
      return res.status(400).json({ message: 'Informations incomplètes' });
    }

    // Vérifier que l'employé existe et appartient au tenant
    const employee = await Employee.findOne({ _id: employeeId, tenantId });
    if (!employee) {
      return res.status(404).json({ message: 'Employé non trouvé ou n\'appartient pas à votre organisation' });
    }

    const newSchedule = new Schedule({
      userId, // Keep track of who created it, if needed
      tenantId,
      employeeId,
      startDate,
      endDate,
      title,
      description,
      type: type || 'travail',
      status: status || 'planifié',
      recurrence: recurrence || { isRecurring: false },
      notes
    });

    const savedSchedule = await newSchedule.save();

    // Enrichir la réponse avec les informations de l'employé
    const enrichedSchedule = {
      ...savedSchedule.toObject(),
      employeeName: `${employee.firstName} ${employee.lastName}`,
      employeePosition: employee.position
    };

    return res.status(201).json(enrichedSchedule);
  } catch (error) {
    console.error('Erreur dans createSchedule:', error);
    // Check for potential validation errors
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Erreur de validation', errors: error.errors });
    }
    return next(error);
  }
};

/**
 * Met à jour un planning existant
 */
export const updateSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const updates = req.body;

    // Find the schedule ensuring it belongs to the tenant
    const schedule = await Schedule.findOne({ _id: id, tenantId });
    if (!schedule) {
      return res.status(404).json({ message: 'Planning non trouvé' });
    }

    // Prevent changing tenantId or userId directly if they are in updates
    delete updates.tenantId;
    delete updates.userId;

    // Si l'employeeId est mis à jour, vérifier que le nouvel employé existe et appartient au tenant
    if (updates.employeeId && updates.employeeId !== schedule.employeeId.toString()) {
      const employee = await Employee.findOne({ _id: updates.employeeId, tenantId });
      if (!employee) {
        return res.status(404).json({ message: 'Nouvel employé non trouvé ou n\'appartient pas à votre organisation' });
      }
    }

    const updatedSchedule = await Schedule.findByIdAndUpdate(id, updates, { new: true, runValidators: true });

    // Enrichir la réponse avec les informations de l'employé
    const employee = await Employee.findById(updatedSchedule.employeeId).select("firstName lastName position");
    const enrichedSchedule = {
      ...updatedSchedule.toObject(),
      employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu',
      employeePosition: employee ? employee.position : ''
    };

    return res.json(enrichedSchedule);
  } catch (error) {
    console.error('Erreur dans updateSchedule:', error);
    if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Erreur de validation', errors: error.errors });
    }
    return next(error);
  }
};

/**
 * Supprime un planning
 */
export const deleteSchedule = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const schedule = await Schedule.findOneAndDelete({ _id: id, tenantId });
    if (!schedule) {
      return res.status(404).json({ message: 'Planning non trouvé' });
    }

    return res.json({ message: 'Planning supprimé avec succès' });
  } catch (error) {
    console.error('Erreur dans deleteSchedule:', error);
    return next(error);
  }
};

/**
 * Génère un planning hebdomadaire pour tous les employés actifs
 * (Note: This function seems complex and might need refinement based on actual requirements)
 */
export const generateWeeklySchedule = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const tenantId = req.user.tenantId;
    const { startDate } = req.body; // Assuming templateId is handled differently or not used yet

    if (!startDate) {
      return res.status(400).json({ message: 'Date de début requise' });
    }

    // Récupérer tous les employés actifs du tenant
    const employees = await Employee.find({ tenantId, isActive: true });

    if (employees.length === 0) {
      return res.status(404).json({ message: 'Aucun employé actif trouvé' });
    }

    const weekStart = new Date(startDate);
    weekStart.setHours(0, 0, 0, 0); // Ensure start of the day

    const createdSchedules = [];

    for (const employee of employees) {
      // Utiliser les horaires définis dans le profil de l'employé si disponibles
      if (employee.schedule) { // Assuming employee.schedule holds the weekly template
        const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

        for (let i = 0; i < 7; i++) {
          const currentDay = new Date(weekStart);
          currentDay.setDate(currentDay.getDate() + i);

          const dayName = daysOfWeek[currentDay.getDay()];
          const scheduleForDay = employee.schedule[dayName]; // e.g., "9h-17h" or "repos"

          // Si l'employé a un horaire défini pour ce jour et ce n'est pas repos
          if (scheduleForDay && !/repos/i.test(scheduleForDay)) {
            // Extraire les heures de début et de fin (format attendu: "9h-17h" ou "9:30-17:30")
            const timeMatch = scheduleForDay.match(/(\d{1,2})(?::(\d{2}))?\s*h?\s*-\s*(\d{1,2})(?::(\d{2}))?\s*h?/i);

            if (timeMatch) {
              const startHour = parseInt(timeMatch[1]);
              const startMinute = parseInt(timeMatch[2] || '0');
              const endHour = parseInt(timeMatch[3]);
              const endMinute = parseInt(timeMatch[4] || '0');

              const shiftStart = new Date(currentDay);
              shiftStart.setHours(startHour, startMinute, 0, 0);

              const shiftEnd = new Date(currentDay);
              shiftEnd.setHours(endHour, endMinute, 0, 0);

              // Basic check: if end time is earlier than start time, assume it ends next day (e.g., night shift)
              // This might need more robust logic depending on requirements
              if (shiftEnd <= shiftStart) {
                  shiftEnd.setDate(shiftEnd.getDate() + 1);
              }

              const newSchedule = new Schedule({
                userId,
                tenantId,
                employeeId: employee._id,
                startDate: shiftStart,
                endDate: shiftEnd,
                title: `Travail - ${employee.firstName} ${employee.lastName}`,
                description: `Horaire régulier généré`,
                type: 'travail',
                status: 'planifié'
              });

              try {
                  const savedSchedule = await newSchedule.save();
                  createdSchedules.push(savedSchedule);
              } catch (saveError) {
                  console.error(`Erreur lors de la sauvegarde du planning pour ${employee.firstName} ${employee.lastName} le ${currentDay.toDateString()}:`, saveError);
                  // Decide how to handle partial failures: continue, stop, collect errors?
                  // For now, just log and continue.
              }
            }
          }
        }
      }
    }

    return res.status(201).json({
      message: `${createdSchedules.length} plannings créés avec succès pour la semaine du ${weekStart.toLocaleDateString()}`,
      schedules: createdSchedules
    });
  } catch (error) {
    console.error('Erreur dans generateWeeklySchedule:', error);
    return next(error);
  }
};

/**
 * Récupère les conflits de planning pour un employé ou tous les employés
 */
export const getScheduleConflicts = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate, employeeId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Dates de début et de fin requises' });
    }

    const query = {
      tenantId,
      $or: [
        { startDate: { $lt: new Date(endDate), $gte: new Date(startDate) } }, // Starts within the period
        { endDate: { $gt: new Date(startDate), $lte: new Date(endDate) } }, // Ends within the period
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } } // Spans over the period
      ]
    };

    // Filtrer par employé si spécifié
    if (employeeId) {
      query.employeeId = employeeId;
    }

    // Récupérer tous les plannings dans la période
    const schedules = await Schedule.find(query).sort({ employeeId: 1, startDate: 1 });

    // Identifier les conflits (chevauchements pour le même employé)
    const conflicts = [];
    const employeeSchedules = {};

    // Regrouper les plannings par employé
    schedules.forEach(schedule => {
      const empId = schedule.employeeId.toString();
      if (!employeeSchedules[empId]) {
        employeeSchedules[empId] = [];
      }
      employeeSchedules[empId].push(schedule);
    });

    // Vérifier les chevauchements pour chaque employé
    for (const empId in employeeSchedules) {
      const empSchedules = employeeSchedules[empId]; // Already sorted by startDate

      for (let i = 0; i < empSchedules.length - 1; i++) {
          const s1 = empSchedules[i];
          const s2 = empSchedules[i+1]; // Check adjacent schedule for the same employee

          // Check if s1 overlaps with s2 (since they are sorted by start date, we only need this check)
          if (s1.endDate > s2.startDate) {
              conflicts.push({
                  employeeId: empId,
                  schedule1_id: s1._id,
                  schedule1_start: s1.startDate,
                  schedule1_end: s1.endDate,
                  schedule2_id: s2._id,
                  schedule2_start: s2.startDate,
                  schedule2_end: s2.endDate,
              });
          }
      }
    }

    // Enrichir les conflits avec les informations des employés
    const conflictingEmployeeIds = [...new Set(conflicts.map(c => c.employeeId))];
    const employees = await Employee.find({ _id: { $in: conflictingEmployeeIds } }).select("firstName lastName position");
    const employeeMap = employees.reduce((map, emp) => {
        map[emp._id.toString()] = emp;
        return map;
    }, {});

    const enrichedConflicts = conflicts.map(conflict => {
      const employee = employeeMap[conflict.employeeId];
      return {
        ...conflict,
        employeeName: employee ? `${employee.firstName} ${employee.lastName}` : 'Employé inconnu',
        employeePosition: employee ? employee.position : ''
      };
    });

    return res.json(enrichedConflicts);
  } catch (error) {
    console.error('Erreur dans getScheduleConflicts:', error);
    return next(error);
  }
};

