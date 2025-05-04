// backend/controllers/employeeController.js
import Joi from "joi";
import Employee from "../models/employeeModel.js";
import mongoose from "mongoose";

// Schéma de validation pour la création d\"employé
const createEmployeeSchema = Joi.object({
  firstName: Joi.string().required(),
  lastName: Joi.string().required(),
  email: Joi.string().email().allow("", null),
  phone: Joi.string().allow("", null),
  position: Joi.string().required(),
  department: Joi.string().allow("", null),
  salary: Joi.number().min(0).allow(null),
  hireDate: Joi.date().default(() => new Date()),
  isActive: Joi.boolean().default(true),
  notes: Joi.string().allow("", null),
});

// Schéma de validation pour la mise à jour d\"employé
const updateEmployeeSchema = Joi.object({
  firstName: Joi.string(),
  lastName: Joi.string(),
  email: Joi.string().email().allow("", null),
  phone: Joi.string().allow("", null),
  position: Joi.string(),
  department: Joi.string().allow("", null),
  salary: Joi.number().min(0).allow(null),
  hireDate: Joi.date(),
  isActive: Joi.boolean(),
  notes: Joi.string().allow("", null),
}).min(1); 

/**
 * Récupère tous les employés d\"un tenant
 * @route GET /api/employees
 * @access Private
 */
export const getEmployees = async (req, res, next) => {
  console.log("Entering getEmployees controller"); // DEBUG LOG
  try {
    const tenantId = req.user.tenantId;
    const { active } = req.query;

    const query = { tenantId };

    if (active !== undefined) {
      query.isActive = active === "true";
    }

    const employeesQuery = Employee.find(query).sort({ lastName: 1, firstName: 1 });
    const employees = await employeesQuery.exec(); 
    
    return res.status(200).json(employees); 
  } catch (error) {
    return next(error); 
  }
};

/**
 * Récupère un employé spécifique par ID
 * @route GET /api/employees/:id
 * @access Private
 */
export const getEmployee = async (req, res, next) => {
  console.log(`Entering getEmployee controller with id: ${req.params.id}`); // DEBUG LOG
  // FIX: Check ObjectId validity FIRST
  console.log(`Checking validity for id: ${req.params.id}`); // DEBUG LOG
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    console.log(`ID ${req.params.id} is invalid, returning 400`); // DEBUG LOG
    return res.status(400).json({ message: "ID d\"employé invalide" });
  }
  console.log(`ID ${req.params.id} is valid, proceeding`); // DEBUG LOG
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const employeeQuery = Employee.findOne({ _id: id, tenantId });
    const employee = await employeeQuery.exec();

    if (!employee) {
      return res.status(404).json({ message: "Employé non trouvé" });
    }

    return res.status(200).json(employee); 
  } catch (error) {
    // CastError should ideally not happen if isValid check is done first,
    // but keep as a fallback for unexpected Mongoose errors.
    if (error.name === "CastError" && error.path === "_id") {
        return res.status(400).json({ message: "ID d\"employé invalide (CastError)" }); // Slightly different message for debugging
    }
    return next(error); 
  }
};

/**
 * Crée un nouvel employé
 * @route POST /api/employees
 * @access Private (Admin/Manager?)
 */
export const createEmployee = async (req, res, next) => {
  console.log("Entering createEmployee controller"); // DEBUG LOG
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user._id; 

    const { error, value } = createEmployeeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    const savedEmployee = await Employee.create({
      ...value,
      tenantId,
      userId,
    });

    return res.status(201).json(savedEmployee);
  } catch (error) {
     if (error.code === 11000) { 
        return res.status(409).json({ message: "Un employé avec cet email existe déjà."}) 
    }
    return next(error); 
  }
};

/**
 * Met à jour un employé existant
 * @route PUT /api/employees/:id
 * @access Private (Admin/Manager?)
 */
export const updateEmployee = async (req, res, next) => {
  console.log(`Entering updateEmployee controller with id: ${req.params.id}`); // DEBUG LOG
  // FIX: Check ObjectId validity FIRST
  console.log(`Checking validity for id: ${req.params.id}`); // DEBUG LOG
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    console.log(`ID ${req.params.id} is invalid, returning 400`); // DEBUG LOG
    return res.status(400).json({ message: "ID d\"employé invalide" });
  }
  console.log(`ID ${req.params.id} is valid, proceeding`); // DEBUG LOG
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const { error, value } = updateEmployeeSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    const updatedEmployeeQuery = Employee.findOneAndUpdate(
      { _id: id, tenantId }, 
      value,
      { new: true, runValidators: true }
    );
    const updatedEmployee = await updatedEmployeeQuery.exec();

    if (!updatedEmployee) {
      return res.status(404).json({ message: "Employé non trouvé ou non autorisé" });
    }

    return res.status(200).json(updatedEmployee); 
  } catch (error) {
    if (error.code === 11000) {
        return res.status(409).json({ message: "Un employé avec cet email existe déjà."}) 
    }
    // CastError should ideally not happen if isValid check is done first
    if (error.name === "CastError" && error.path === "_id") {
        return res.status(400).json({ message: "ID d\"employé invalide (CastError)" });
    }
    return next(error); 
  }
};

/**
 * Supprime (désactive ou supprime définitivement) un employé
 * @route DELETE /api/employees/:id
 * @access Private (Admin/Manager?)
 */
export const deleteEmployee = async (req, res, next) => {
  console.log(`Entering deleteEmployee controller with id: ${req.params.id}`); // DEBUG LOG
  // FIX: Check ObjectId validity FIRST
  console.log(`Checking validity for id: ${req.params.id}`); // DEBUG LOG
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    console.log(`ID ${req.params.id} is invalid, returning 400`); // DEBUG LOG
    return res.status(400).json({ message: "ID d\"employé invalide" });
  }
  console.log(`ID ${req.params.id} is valid, proceeding`); // DEBUG LOG
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { hardDelete } = req.query; 

    if (hardDelete === "true") {
        const result = await Employee.deleteOne({ _id: id, tenantId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Employé non trouvé ou non autorisé" });
        }
        return res.status(200).json({ message: "Employé supprimé définitivement" }); 
    } else {
        const employeeQuery = Employee.findOneAndUpdate(
            { _id: id, tenantId },
            { isActive: false },
            { new: true }
        );
        const employee = await employeeQuery.exec();
        
        if (!employee) {
            return res.status(404).json({ message: "Employé non trouvé ou non autorisé" });
        }
        return res.status(200).json({ message: "Employé désactivé", employee }); 
    }
  } catch (error) {
    // CastError should ideally not happen if isValid check is done first
    if (error.name === "CastError" && error.path === "_id") {
        return res.status(400).json({ message: "ID d\"employé invalide (CastError)" });
    }
    return next(error); 
  }
};

/**
 * Désactive un employé (alternative via PATCH)
 * @route PATCH /api/employees/:id/deactivate
 * @access Private (Admin/Manager?)
 */
export const deactivateEmployee = async (req, res, next) => {
  console.log(`Entering deactivateEmployee controller with id: ${req.params.id}`); // DEBUG LOG
  // FIX: Check ObjectId validity FIRST
  console.log(`Checking validity for id: ${req.params.id}`); // DEBUG LOG
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    console.log(`ID ${req.params.id} is invalid, returning 400`); // DEBUG LOG
    return res.status(400).json({ message: "ID d\"employé invalide" });
  }
  console.log(`ID ${req.params.id} is valid, proceeding`); // DEBUG LOG
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const employeeQuery = Employee.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: false },
      { new: true }
    );
    const employee = await employeeQuery.exec();

    if (!employee) {
      return res.status(404).json({ message: "Employé non trouvé ou non autorisé" });
    }

    return res.status(200).json({ message: "Employé désactivé", employee }); 
  } catch (error) {
    // CastError should ideally not happen if isValid check is done first
    if (error.name === "CastError" && error.path === "_id") {
        return res.status(400).json({ message: "ID d\"employé invalide (CastError)" });
    }
    return next(error); 
  }
};

/**
 * Réactive un employé (alternative via PATCH)
 * @route PATCH /api/employees/:id/reactivate
 * @access Private (Admin/Manager?)
 */
export const reactivateEmployee = async (req, res, next) => {
  console.log(`Entering reactivateEmployee controller with id: ${req.params.id}`); // DEBUG LOG
  // FIX: Check ObjectId validity FIRST
  console.log(`Checking validity for id: ${req.params.id}`); // DEBUG LOG
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    console.log(`ID ${req.params.id} is invalid, returning 400`); // DEBUG LOG
    return res.status(400).json({ message: "ID d\"employé invalide" });
  }
  console.log(`ID ${req.params.id} is valid, proceeding`); // DEBUG LOG
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    const employeeQuery = Employee.findOneAndUpdate(
      { _id: id, tenantId },
      { isActive: true },
      { new: true }
    );
    const employee = await employeeQuery.exec();

    if (!employee) {
      return res.status(404).json({ message: "Employé non trouvé ou non autorisé" });
    }

    return res.status(200).json({ message: "Employé réactivé", employee }); 
  } catch (error) {
    // CastError should ideally not happen if isValid check is done first
    if (error.name === "CastError" && error.path === "_id") {
        return res.status(400).json({ message: "ID d\"employé invalide (CastError)" });
    }
    return next(error); 
  }
};

/**
 * Obtient des statistiques sur les employés du tenant
 * @route GET /api/employees/stats
 * @access Private
 */
export const getEmployeeStats = async (req, res, next) => {
  console.log("Entering getEmployeeStats controller"); // DEBUG LOG
  try {
    const tenantId = req.user.tenantId;

    const employeesQuery = Employee.find({ tenantId });
    const employees = await employeesQuery.exec();

    if (!Array.isArray(employees)) {
        return res.status(500).json({ message: "Erreur interne lors de la récupération des statistiques employés." });
    }

    const totalEmployees = employees.length;
    const activeEmployees = employees.filter((e) => e.isActive).length;
    const inactiveEmployees = totalEmployees - activeEmployees;

    const departmentCounts = {};
    employees.forEach((employee) => {
      const key = employee.department || employee.position || "Non défini";
      if (!departmentCounts[key]) {
        departmentCounts[key] = 0;
      }
      departmentCounts[key]++;
    });

    const totalSalary = employees.reduce((sum, employee) => {
      if (employee.isActive && typeof employee.salary === 'number') { 
        return sum + employee.salary;
      }
      return sum;
    }, 0);

    return res.status(200).json({ 
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      departmentCounts,
      totalSalary,
    });
  } catch (error) {
    return next(error); 
  }
};

