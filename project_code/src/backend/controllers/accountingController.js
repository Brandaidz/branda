// backend/controllers/accountingController.js
import Joi from "joi";
import mongoose from "mongoose";
import AccountingEntry from "../models/accountingEntryModel.js";
import Sale from "../models/saleModel.js";

// --- Validation Schemas ---

const entrySchemaBase = {
  date: Joi.date(),
  type: Joi.string().valid("revenu", "dépense").required(),
  category: Joi.string().required(),
  amount: Joi.number().min(0).required(),
  description: Joi.string().allow("", null),
  relatedSaleId: Joi.string().allow(null, ""), // Keep as string for validation, convert later if needed
  paymentMethod: Joi.string().allow("", null),
  isRecurring: Joi.boolean().default(false),
  recurringPeriod: Joi.string()
    .valid("quotidien", "hebdomadaire", "mensuel", "annuel")
    .allow(null)
    .when("isRecurring", { is: true, then: Joi.required() }),
  tags: Joi.array().items(Joi.string()).allow(null),
  attachmentUrl: Joi.string().uri().allow(null, ""),
  // tenantId will be added from req.user
};

const createEntrySchema = Joi.object({
  ...entrySchemaBase,
  date: entrySchemaBase.date.default(() => new Date()), // Default date on creation
});

const updateEntrySchema = Joi.object({
  ...entrySchemaBase,
  // Make fields optional for update
  type: Joi.string().valid("revenu", "dépense"),
  category: Joi.string(),
  amount: Joi.number().min(0),
}).min(1); // Require at least one field to update

const getEntriesSchema = Joi.object({
  startDate: Joi.date(),
  endDate: Joi.date(),
  type: Joi.string().valid("revenu", "dépense"),
  category: Joi.string(),
  limit: Joi.number().integer().min(1),
});

const importSalesSchema = Joi.object({
  startDate: Joi.date(),
  endDate: Joi.date(),
});

const generateReportSchema = Joi.object({
  startDate: Joi.date().required(),
  endDate: Joi.date().required(),
  groupBy: Joi.string().valid("day", "week", "month"),
});

const generateDailyReportSchema = Joi.object({
  date: Joi.date(), // Optional, defaults to today
});

// --- Helper Functions ---

// Helper to get start/end of a day
const getDayBounds = (date) => {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// --- Controller Functions ---

/**
 * Récupère toutes les entrées comptables d\"un tenant
 * @route GET /api/accounting
 * @access Private
 */
export const getEntries = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Validation des query params
    const { error, value } = getEntriesSchema.validate(req.query);
    if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }
    const { startDate, endDate, type, category, limit } = value;

    const query = { tenantId };

    // Filtrer par date
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }
    // Filtrer par type
    if (type) query.type = type;
    // Filtrer par catégorie
    if (category) query.category = category;

    const entriesQuery = AccountingEntry.find(query).sort({ date: -1 });

    if (limit) {
      entriesQuery.limit(limit);
    }

    const entries = await entriesQuery;
    return res.json(entries);
  } catch (error) {
    console.error("Erreur dans getEntries:", error);
    return next(error);
  }
};

/**
 * Récupère une entrée comptable spécifique par ID
 * @route GET /api/accounting/:id
 * @access Private
 */
export const getEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID d\"entrée invalide" });
    }

    const entry = await AccountingEntry.findOne({ _id: id, tenantId });

    if (!entry) {
      return res.status(404).json({ message: "Entrée comptable non trouvée ou accès non autorisé" });
    }

    return res.json(entry);
  } catch (error) {
    console.error("Erreur dans getEntry:", error);
    return next(error);
  }
};

/**
 * Crée une nouvelle entrée comptable
 * @route POST /api/accounting
 * @access Private
 */
export const createEntry = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Validation du body
    const { error, value } = createEntrySchema.validate(req.body);
    if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    // Convertir relatedSaleId si présent et valide
    let relatedSaleObjectId = null;
    if (value.relatedSaleId && mongoose.Types.ObjectId.isValid(value.relatedSaleId)) {
        relatedSaleObjectId = new mongoose.Types.ObjectId(value.relatedSaleId);
        // Optionnel: Vérifier que la vente appartient au tenant
        const saleExists = await Sale.findOne({ _id: relatedSaleObjectId, tenantId });
        if (!saleExists) {
            return res.status(400).json({ message: `Vente associée (${value.relatedSaleId}) non trouvée pour ce tenant.` });
        }
    }

    const newEntry = new AccountingEntry({
      ...value,
      tenantId,
      relatedSaleId: relatedSaleObjectId, // Utiliser l\"ObjectId converti
    });

    const savedEntry = await newEntry.save();
    return res.status(201).json(savedEntry);
  } catch (error) {
    console.error("Erreur dans createEntry:", error);
    return next(error);
  }
};

/**
 * Met à jour une entrée comptable existante
 * @route PUT /api/accounting/:id
 * @access Private
 */
export const updateEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID d\"entrée invalide" });
    }

    // Validation du body
    const { error, value } = updateEntrySchema.validate(req.body);
     if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    // Convertir relatedSaleId si présent et valide
    if (value.relatedSaleId && mongoose.Types.ObjectId.isValid(value.relatedSaleId)) {
        value.relatedSaleId = new mongoose.Types.ObjectId(value.relatedSaleId);
        // Optionnel: Vérifier que la vente appartient au tenant
        const saleExists = await Sale.findOne({ _id: value.relatedSaleId, tenantId });
        if (!saleExists) {
            return res.status(400).json({ message: `Vente associée (${req.body.relatedSaleId}) non trouvée pour ce tenant.` });
        }
    } else if (value.relatedSaleId === "" || value.relatedSaleId === null) {
        value.relatedSaleId = null; // Allow clearing the related sale
    }

    const updatedEntry = await AccountingEntry.findOneAndUpdate(
      { _id: id, tenantId },
      value,
      { new: true, runValidators: true }
    );

    if (!updatedEntry) {
      return res.status(404).json({ message: "Entrée comptable non trouvée ou accès non autorisé" });
    }

    return res.json(updatedEntry);
  } catch (error) {
    console.error("Erreur dans updateEntry:", error);
    return next(error);
  }
};

/**
 * Supprime une entrée comptable
 * @route DELETE /api/accounting/:id
 * @access Private
 */
export const deleteEntry = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID d\"entrée invalide" });
    }

    const result = await AccountingEntry.deleteOne({ _id: id, tenantId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: "Entrée comptable non trouvée ou accès non autorisé" });
    }

    return res.json({ message: "Entrée comptable supprimée avec succès" });
  } catch (error) {
    console.error("Erreur dans deleteEntry:", error);
    return next(error);
  }
};

/**
 * Importe les ventes comme entrées comptables pour le tenant
 * @route POST /api/accounting/import-sales
 * @access Private
 */
export const importSales = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Validation du body
    const { error, value } = importSalesSchema.validate(req.body);
     if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }
    const { startDate, endDate } = value;

    // Construire la requête pour les ventes
    const query = { tenantId, status: "complétée" };
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = startDate;
      if (endDate) query.date.$lte = endDate;
    }

    // Récupérer les ventes
    const sales = await Sale.find(query);

    if (sales.length === 0) {
      return res.json({ message: "Aucune nouvelle vente à importer pour cette période", count: 0 });
    }

    // Récupérer les IDs des ventes déjà importées pour ce tenant
    const existingEntries = await AccountingEntry.find(
        { tenantId, relatedSaleId: { $in: sales.map(s => s._id) } },
        { relatedSaleId: 1 } // Projeter uniquement relatedSaleId
    );
    const importedSaleIds = new Set(existingEntries.map(e => e.relatedSaleId.toString()));

    // Filtrer les ventes non encore importées
    const salesToImport = sales.filter(sale => !importedSaleIds.has(sale._id.toString()));

    if (salesToImport.length === 0) {
        return res.json({ message: "Aucune nouvelle vente à importer pour cette période", count: 0 });
    }

    // Préparer les nouvelles entrées
    const newEntries = salesToImport.map(sale => ({
      tenantId,
      date: sale.date,
      type: "revenu",
      category: "Ventes",
      amount: sale.totalAmount,
      description: `Vente ${sale._id} - ${sale.items.length} article(s)`,
      relatedSaleId: sale._id,
      paymentMethod: sale.paymentMethod,
    }));

    // Insérer les nouvelles entrées en masse
    const insertedEntries = await AccountingEntry.insertMany(newEntries);

    return res.status(201).json({
      message: `${insertedEntries.length} vente(s) importée(s) avec succès`,
      count: insertedEntries.length,
      // entries: insertedEntries // Optionnel: retourner les entrées créées
    });
  } catch (error) {
    console.error("Erreur dans importSales:", error);
    return next(error);
  }
};

/**
 * Génère un rapport financier pour une période donnée pour le tenant
 * @route GET /api/accounting/report
 * @access Private
 */
export const generateReport = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Validation des query params
    const { error, value } = generateReportSchema.validate(req.query);
     if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }
    const { startDate, endDate, groupBy } = value;

    // Récupérer toutes les entrées pour la période
    const entries = await AccountingEntry.find({
      tenantId,
      date: { $gte: startDate, $lte: endDate },
    });

    // Calculer les totaux
    let totalRevenues = 0;
    let totalExpenses = 0;
    const categorySummary = {};

    entries.forEach((entry) => {
      if (entry.type === "revenu") {
        totalRevenues += entry.amount;
      } else {
        totalExpenses += entry.amount;
      }

      if (!categorySummary[entry.category]) {
        categorySummary[entry.category] = { revenues: 0, expenses: 0 };
      }
      if (entry.type === "revenu") {
        categorySummary[entry.category].revenues += entry.amount;
      } else {
        categorySummary[entry.category].expenses += entry.amount;
      }
    });

    const netProfit = totalRevenues - totalExpenses;

    // Regrouper par période si demandé
    let timeSeriesData = null;
    if (groupBy) {
      timeSeriesData = entries.reduce((acc, entry) => {
        let periodKey;
        const entryDate = new Date(entry.date);
        if (groupBy === "day") {
          periodKey = entryDate.toISOString().split("T")[0];
        } else if (groupBy === "week") {
          const day = entryDate.getDay();
          const diff = entryDate.getDate() - day + (day === 0 ? -6 : 1);
          const monday = new Date(entryDate);
          monday.setDate(diff);
          monday.setHours(0,0,0,0);
          periodKey = monday.toISOString().split("T")[0];
        } else { // month
          periodKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, "0")}`;
        }

        if (!acc[periodKey]) {
          acc[periodKey] = { revenues: 0, expenses: 0 };
        }
        if (entry.type === "revenu") acc[periodKey].revenues += entry.amount;
        else acc[periodKey].expenses += entry.amount;

        return acc;
      }, {});

      timeSeriesData = Object.entries(timeSeriesData)
        .map(([period, data]) => ({
          period,
          ...data,
          netProfit: data.revenues - data.expenses,
        }))
        .sort((a, b) => a.period.localeCompare(b.period));
    }

    return res.json({
      period: {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
      },
      summary: {
        totalRevenues,
        totalExpenses,
        netProfit,
        profitMargin: totalRevenues > 0 ? (netProfit / totalRevenues) * 100 : 0,
      },
      categorySummary,
      timeSeriesData,
    });
  } catch (error) {
    console.error("Erreur dans generateReport:", error);
    return next(error);
  }
};

/**
 * Génère un rapport quotidien pour le tenant
 * @route GET /api/accounting/daily-report
 * @access Private
 */
export const generateDailyReport = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Validation des query params
    const { error, value } = generateDailyReportSchema.validate(req.query);
     if (error) {
      return res
        .status(400)
        .json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    const reportDate = value.date || new Date(); // Use provided date or today
    const { start: startOfDay, end: endOfDay } = getDayBounds(reportDate);

    // Récupérer les ventes du jour
    const sales = await Sale.find({
      tenantId,
      date: { $gte: startOfDay, $lte: endOfDay },
      status: "complétée",
    });

    // Récupérer les entrées comptables du jour
    const entries = await AccountingEntry.find({
      tenantId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    // Calculer les statistiques de vente
    const totalSalesCount = sales.length;
    const totalSalesRevenue = sales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const averageSaleValue = totalSalesCount > 0 ? totalSalesRevenue / totalSalesCount : 0;

    // Produits les plus vendus
    const productCounts = sales.reduce((acc, sale) => {
        sale.items.forEach(item => {
            const name = item.productName || `Produit ID ${item.productId}`;
            if (!acc[name]) acc[name] = { quantity: 0, revenue: 0 };
            acc[name].quantity += item.quantity;
            acc[name].revenue += item.totalPrice;
        });
        return acc;
    }, {});
    const topProducts = Object.entries(productCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // Calculer les totaux des entrées comptables
    let totalAccountingRevenues = 0;
    let totalAccountingExpenses = 0;
    entries.forEach(entry => {
        if (entry.type === "revenu") totalAccountingRevenues += entry.amount;
        else totalAccountingExpenses += entry.amount;
    });
    const netAccountingProfit = totalAccountingRevenues - totalAccountingExpenses;

    // Comparaison avec la veille (optionnel, peut être coûteux)
    // const { start: startOfPrevDay, end: endOfPrevDay } = getDayBounds(new Date(startOfDay.getTime() - 86400000));
    // const previousSales = await Sale.find({ tenantId, date: { $gte: startOfPrevDay, $lte: endOfPrevDay }, status: "complétée" });
    // const previousRevenue = previousSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    // const revenueChange = previousRevenue > 0 ? ((totalSalesRevenue - previousRevenue) / previousRevenue) * 100 : (totalSalesRevenue > 0 ? 100 : 0);

    return res.json({
      date: reportDate.toISOString().split("T")[0],
      sales: {
        count: totalSalesCount,
        revenue: totalSalesRevenue,
        averageValue: averageSaleValue,
        topProducts,
      },
      accounting: {
        revenues: totalAccountingRevenues,
        expenses: totalAccountingExpenses,
        netProfit: netAccountingProfit,
      },
      // comparison: {
      //   previousRevenue,
      //   revenueChange,
      // },
    });
  } catch (error) {
    console.error("Erreur dans generateDailyReport:", error);
    return next(error);
  }
};

