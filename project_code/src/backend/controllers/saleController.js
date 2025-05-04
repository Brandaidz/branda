// backend/controllers/saleController.js
import Joi from "joi";
import Sale from "../models/saleModel.js";
import Product from "../models/productModel.js";
import mongoose from "mongoose";

// --- Validation Schemas ---

// Schéma pour un article dans une vente
const saleItemSchema = Joi.object({
  productId: Joi.string().required(), // Garder comme string pour la validation initiale, sera converti en ObjectId
  productName: Joi.string().required(),
  quantity: Joi.number().integer().min(1).required(),
  unitPrice: Joi.number().min(0).required(),
  totalPrice: Joi.number().min(0).required(),
});

// Schéma pour la création de vente
const createSaleSchema = Joi.object({
  date: Joi.date().default(() => new Date()),
  customer: Joi.object({
    name: Joi.string().allow("", null),
    email: Joi.string().email().allow("", null),
    phone: Joi.string().allow("", null),
  }).allow(null),
  items: Joi.array().items(saleItemSchema).min(1).required(),
  totalAmount: Joi.number().min(0).required(),
  paymentMethod: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
  status: Joi.string().valid("complétée", "en attente", "annulée").default("complétée"),
  // userId/tenantId sera ajouté depuis req.user
});

// Schéma pour la mise à jour de vente (plus flexible)
const updateSaleSchema = Joi.object({
  date: Joi.date(),
  customer: Joi.object({
    name: Joi.string().allow("", null),
    email: Joi.string().email().allow("", null),
    phone: Joi.string().allow("", null),
  }).allow(null),
  items: Joi.array().items(saleItemSchema).min(1),
  totalAmount: Joi.number().min(0), // Recalculé si items change
  paymentMethod: Joi.string().allow("", null),
  notes: Joi.string().allow("", null),
  status: Joi.string().valid("complétée", "en attente", "annulée"),
}).min(1);

// Schéma pour l\"annulation de vente
const cancelSaleSchema = Joi.object({
    reason: Joi.string().allow("", null),
});

// --- Controller Functions ---

/**
 * Récupère toutes les ventes d\"un tenant
 * @route GET /api/sales
 * @access Private
 */
export const getSales = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate, limit, status } = req.query;

    const query = { tenantId };

    // Filtrer par date
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }
    // Filtrer par statut
    if (status) {
        query.status = status;
    }

    const salesQuery = Sale.find(query).sort({ date: -1 });

    if (limit) {
      salesQuery.limit(parseInt(limit));
    }

    const sales = await salesQuery;
    return res.json(sales);
  } catch (error) {
    console.error("Erreur dans getSales:", error);
    return next(error);
  }
};

/**
 * Récupère une vente spécifique par ID
 * @route GET /api/sales/:id
 * @access Private
 */
export const getSale = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de vente invalide" });
    }

    const sale = await Sale.findOne({ _id: id, tenantId });

    if (!sale) {
      return res.status(404).json({ message: "Vente non trouvée" });
    }

    return res.json(sale);
  } catch (error) {
    console.error("Erreur dans getSale:", error);
    return next(error);
  }
};

/**
 * Crée une nouvelle vente
 * @route POST /api/sales
 * @access Private
 */
export const createSale = async (req, res, next) => {
  const session = await mongoose.startSession(); // Start transaction
  session.startTransaction();
  try {
    const tenantId = req.user.tenantId;
    const userId = req.user._id; // ID de l\"utilisateur qui crée la vente

    // Validation avec Joi
    const { error, value } = createSaleSchema.validate(req.body);
    if (error) {
      console.error("Erreur de validation Joi (createSale):", error.details);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    // Vérifier la cohérence du totalAmount
    const calculatedTotal = value.items.reduce((sum, item) => sum + item.totalPrice, 0);
    if (Math.abs(calculatedTotal - value.totalAmount) > 0.01) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
            message: "Le montant total fourni ne correspond pas à la somme des articles calculée.",
            calculatedTotal: calculatedTotal.toFixed(2),
            providedTotal: value.totalAmount.toFixed(2)
        });
    }

    // Vérifier la disponibilité des produits et préparer les mises à jour de stock
    const stockUpdates = [];
    for (const item of value.items) {
        if (!mongoose.Types.ObjectId.isValid(item.productId)) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: `ID de produit invalide: ${item.productId}` });
        }
        const product = await Product.findOne({ _id: item.productId, tenantId }).session(session);
        if (!product) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: `Produit non trouvé: ${item.productName} (ID: ${item.productId})` });
        }
        if (product.stock < item.quantity) {
            await session.abortTransaction();
            session.endSession();
            return res.status(400).json({ message: `Stock insuffisant pour ${product.name}. Stock actuel: ${product.stock}, Quantité demandée: ${item.quantity}` });
        }
        stockUpdates.push({
            updateOne: {
                filter: { _id: item.productId, tenantId },
                update: { $inc: { stock: -item.quantity } }
            }
        });
    }

    // Créer la vente
    const newSale = new Sale({
      ...value,
      tenantId,
      userId, // Associer la vente à l\"utilisateur créateur
    });

    const savedSale = await newSale.save({ session });

    // Appliquer les mises à jour de stock
    if (stockUpdates.length > 0) {
        await Product.bulkWrite(stockUpdates, { session });
    }

    await session.commitTransaction(); // Commit transaction
    session.endSession();

    return res.status(201).json(savedSale);

  } catch (error) {
    await session.abortTransaction(); // Rollback on error
    session.endSession();
    console.error("Erreur dans createSale:", error);
    return next(error);
  }
};

/**
 * Met à jour une vente existante (Attention: complexité si stock doit être ajusté)
 * @route PUT /api/sales/:id
 * @access Private
 */
export const updateSale = async (req, res, next) => {
  // Note: Updating sales, especially items, can be complex due to stock adjustments.
  // A simpler approach might be to only allow updates for notes, status, customer info.
  // For item changes, cancelling and creating a new sale might be safer.
  // This implementation allows updates but doesn\"t handle stock adjustments on update.
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de vente invalide" });
    }

    // Validation avec Joi
    const { error, value } = updateSaleSchema.validate(req.body);
    if (error) {
      console.error("Erreur de validation Joi (updateSale):", error.details);
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }

    // Recalculer totalAmount si les items sont modifiés
    if (value.items) {
        value.totalAmount = value.items.reduce((sum, item) => sum + item.totalPrice, 0);
    }

    const updatedSale = await Sale.findOneAndUpdate(
      { _id: id, tenantId },
      value,
      { new: true, runValidators: true }
    );

    if (!updatedSale) {
      return res.status(404).json({ message: "Vente non trouvée ou non autorisée" });
    }

    // !! Important: Stock n\"est PAS ajusté ici. A implémenter si nécessaire.

    return res.json(updatedSale);
  } catch (error) {
    console.error("Erreur dans updateSale:", error);
    return next(error);
  }
};

/**
 * Annule une vente et remet les produits en stock
 * @route PATCH /api/sales/:id/cancel
 * @access Private
 */
export const cancelSale = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "ID de vente invalide" });
    }

    // Validation avec Joi
    const { error, value } = cancelSaleSchema.validate(req.body);
     if (error) {
      console.error("Erreur de validation Joi (cancelSale):", error.details);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({ message: `Validation échouée: ${error.details[0].message}` });
    }
    const { reason } = value;

    const sale = await Sale.findOne({ _id: id, tenantId }).session(session);
    if (!sale) {
        await session.abortTransaction();
        session.endSession();
        return res.status(404).json({ message: "Vente non trouvée ou non autorisée" });
    }

    // Ne pas annuler une vente déjà annulée
    if (sale.status === "annulée") {
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ message: "Cette vente est déjà annulée." });
    }

    // Mettre à jour le statut et les notes
    sale.status = "annulée";
    if (reason) {
      sale.notes = sale.notes ? `${sale.notes}\nAnnulée: ${reason}` : `Annulée: ${reason}`;
    }
    await sale.save({ session });

    // Préparer la remise en stock
    const stockUpdates = [];
    for (const item of sale.items) {
      if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
        stockUpdates.push({
            updateOne: {
                filter: { _id: item.productId, tenantId },
                // Augmenter le stock seulement si le produit existe toujours
                update: { $inc: { stock: item.quantity } }
            }
        });
      }
    }

    // Appliquer les mises à jour de stock
    if (stockUpdates.length > 0) {
        await Product.bulkWrite(stockUpdates, { session });
    }

    await session.commitTransaction();
    session.endSession();

    return res.json({ message: "Vente annulée avec succès", sale });

  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error("Erreur dans cancelSale:", error);
    return next(error);
  }
};

/**
 * Obtient des statistiques sur les ventes du tenant
 * @route GET /api/sales/stats
 * @access Private
 */
export const getSalesStats = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    const { startDate, endDate } = req.query;

    const query = { tenantId, status: "complétée" }; // Stats sur les ventes complétées

    // Filtrer par date
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    // Utiliser l\"agrégation pour des calculs plus efficaces
    const stats = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: null, // Grouper toutes les ventes correspondantes
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: "$totalAmount" },
          // Pour les top produits, une étape supplémentaire est nécessaire
        }
      }
    ]);

    const result = stats[0] || { totalSales: 0, totalRevenue: 0 }; // Gérer le cas où il n\"y a pas de ventes

    const averageSaleValue = result.totalSales > 0 ? result.totalRevenue / result.totalSales : 0;

    // Agrégation pour les produits les plus vendus (plus complexe)
    const topProductsAgg = await Sale.aggregate([
        { $match: query },
        { $unwind: "$items" }, // Décomposer le tableau d\"items
        {
            $group: {
                _id: "$items.productId", // Grouper par ID de produit
                name: { $first: "$items.productName" }, // Prendre le nom (suppose qu\"il est constant)
                quantity: { $sum: "$items.quantity" },
                revenue: { $sum: "$items.totalPrice" }
            }
        },
        { $sort: { quantity: -1 } }, // Trier par quantité décroissante
        { $limit: 5 } // Prendre les 5 premiers
    ]);

    return res.json({
      totalSales: result.totalSales,
      totalRevenue: result.totalRevenue,
      averageSaleValue,
      topProducts: topProductsAgg // Renommer _id en productId si nécessaire côté client
    });

  } catch (error) {
    console.error("Erreur dans getSalesStats:", error);
    return next(error);
  }
};

