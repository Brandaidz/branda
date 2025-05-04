// backend/controllers/productController.js
import Joi from "joi";
import Product from "../models/productModel.js";
import mongoose from "mongoose";

// Schéma de validation pour la création de produit
const createProductSchema = Joi.object({
  name: Joi.string().required(),
  description: Joi.string().allow(""),
  price: Joi.number().required().min(0),
  cost: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0).default(0),
  category: Joi.string().allow(""),
  imageUrl: Joi.string().uri().allow(""),
  isActive: Joi.boolean().default(true),
});

// Schéma de validation pour la mise à jour de produit
const updateProductSchema = Joi.object({
  name: Joi.string(),
  description: Joi.string().allow(""),
  price: Joi.number().min(0),
  cost: Joi.number().min(0).allow(null),
  stock: Joi.number().integer().min(0),
  category: Joi.string().allow(""),
  imageUrl: Joi.string().uri().allow(""),
  isActive: Joi.boolean(),
}).min(1); // Au moins un champ doit être mis à jour

// Schéma de validation pour la mise à jour du stock
const updateStockSchema = Joi.object({
  quantity: Joi.number().integer().required(),
  operation: Joi.string().valid("add", "subtract", "set").required(),
});

/**
 * Récupère tous les produits d'un tenant
 * @route GET /api/products
 * @access Private
 */
export const getProducts = async (req, res, next) => {
  try {
    // req.user est attaché par le middleware d'authentification
    const tenantId = req.user.tenantId;
    // Filtrer également par isActive: true par défaut, sauf si un filtre explicite est fourni
    const filter = { tenantId, isActive: true }; 
    // TODO: Ajouter la gestion des filtres via req.query si nécessaire
    const productsResult = await Product.find(filter).sort({ name: 1 }).exec(); // Added .exec()
    // Assurer que products est toujours un tableau
    const products = productsResult && Array.isArray(productsResult) ? productsResult : [];
    const responseBody = {
        success: true,
        count: products.length,
        products: products // Retourne directement le résultat (mock ou mongoose doc)
    };
    // console.log("getProducts responseBody:", JSON.stringify(responseBody, null, 2)); // Log pour débogage
    return res.json(responseBody);
  } catch (error) {
    console.error("Erreur dans getProducts:", error);
    // Ne pas retourner de JSON ici, laisser l'errorHandler global gérer
    return next(error); // Passe à l'errorHandler global
  }
};

/**
 * Récupère un produit spécifique par ID
 * @route GET /api/products/:id
 * @access Private
 */
export const getProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      // Retourner une réponse structurée pour l'erreur 400
      return res.status(400).json({ success: false, message: "ID de produit invalide" });
    }

    // Ajouter isActive: true au filtre pour ne récupérer que les produits actifs
    const product = await Product.findOne({ _id: id, tenantId, isActive: true }).exec(); // Added .exec()

    if (!product) {
      // Retourner une réponse structurée pour l'erreur 404 (message aligné avec le test)
      return res.status(404).json({ success: false, message: "Produit non trouvé" });
    }

    // Retourner une réponse structurée en cas de succès (retour direct du mock/doc)
    return res.json({ success: true, product: product });
  } catch (error) {
    console.error("Erreur dans getProduct:", error);
    return next(error);
  }
};

/**
 * Crée un nouveau produit
 * @route POST /api/products
 * @access Private (Admin/Manager?)
 */
export const createProduct = async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;

    // Validation avec Joi
    const { error, value } = createProductSchema.validate(req.body);
    if (error) {
      // Log de l'erreur de validation pour le débogage
      console.error("Erreur de validation Joi (createProduct):", error.details);
      // Retourner une réponse structurée pour l'erreur 400
      return res.status(400).json({ success: false, message: `Validation échouée: ${error.details[0].message}` });
    }

    const newProduct = new Product({
      ...value,
      tenantId, // Ajout du tenantId de l'utilisateur authentifié
      // isActive est géré par le schéma Joi avec une valeur par défaut
    });

    const savedProduct = await newProduct.save();
    // Retourner une réponse structurée en cas de succès (retour direct du mock/doc)
    return res.status(201).json({ success: true, message: "Produit créé avec succès", product: savedProduct });
  } catch (error) {
    console.error("Erreur dans createProduct:", error);
    // Gestion spécifique des erreurs de duplication si nécessaire
    if (error.code === 11000) {
        // Retourner une réponse structurée pour l'erreur 409
        return res.status(409).json({ success: false, message: "Un produit avec ce nom existe déjà."});
    }
    return next(error);
  }
};

/**
 * Met à jour un produit existant
 * @route PUT /api/products/:id
 * @access Private (Admin/Manager?)
 */
export const updateProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      // Retourner une réponse structurée pour l'erreur 400
      return res.status(400).json({ success: false, message: "ID de produit invalide" });
    }

    // Validation avec Joi
    const { error, value } = updateProductSchema.validate(req.body);
    if (error) {
      console.error("Erreur de validation Joi (updateProduct):", error.details);
      // Retourner une réponse structurée pour l'erreur 400
      return res.status(400).json({ success: false, message: `Validation échouée: ${error.details[0].message}` });
    }

    const updatedProduct = await Product.findOneAndUpdate(
      { _id: id, tenantId }, // Assure que le produit appartient au tenant
      value,
      { new: true, runValidators: true } // Retourne le doc mis à jour et exécute les validateurs Mongoose
    );

    if (!updatedProduct) {
      // Retourner une réponse structurée pour l'erreur 404
      return res.status(404).json({ success: false, message: "Produit non trouvé ou non autorisé" });
    }

    // Retourner une réponse structurée en cas de succès (retour direct du mock/doc)
    return res.json({ success: true, message: "Produit mis à jour avec succès", product: updatedProduct });
  } catch (error) {
    console.error("Erreur dans updateProduct:", error);
    if (error.code === 11000) {
        // Retourner une réponse structurée pour l'erreur 409
        return res.status(409).json({ success: false, message: "Un produit avec ce nom existe déjà."});
    }
    return next(error);
  }
};

/**
 * Supprime un produit (désactivation par défaut)
 * @route DELETE /api/products/:id
 * @access Private (Admin/Manager?)
 */
export const deleteProduct = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;
    const { hardDelete } = req.query; // Option pour suppression définitive

    if (!mongoose.Types.ObjectId.isValid(id)) {
      // Retourner une réponse structurée pour l'erreur 400
      return res.status(400).json({ success: false, message: "ID de produit invalide" });
    }

    if (hardDelete === "true") {
      // Suppression définitive
      const result = await Product.deleteOne({ _id: id, tenantId });
      if (result.deletedCount === 0) {
        // Retourner une réponse structurée pour l'erreur 404 (message aligné avec le test)
        return res.status(404).json({ success: false, message: "Produit non trouvé ou non autorisé" });
      }
      // Retourner une réponse structurée en cas de succès
      return res.json({ success: true, message: "Produit supprimé définitivement" });
    } else {
      // Désactivation (soft delete)
      const product = await Product.findOneAndUpdate(
        { _id: id, tenantId },
        { isActive: false },
        { new: true }
      );
      if (!product) {
        // Retourner une réponse structurée pour l'erreur 404 (message aligné avec le test)
        return res.status(404).json({ success: false, message: "Produit non trouvé ou non autorisé" });
      }
      // Retourner une réponse structurée en cas de succès (retour direct du mock/doc)
      return res.json({ success: true, message: "Produit désactivé", product: product }); // Message aligné avec le test
    }
  } catch (error) {
    console.error("Erreur dans deleteProduct:", error);
    return next(error);
  }
};

/**
 * Met à jour le stock d'un produit
 * @route PATCH /api/products/:id/stock
 * @access Private
 */
export const updateStock = async (req, res, next) => {
  try {
    const { id } = req.params;
    const tenantId = req.user.tenantId;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      // Retourner une réponse structurée pour l'erreur 400
      return res.status(400).json({ success: false, message: "ID de produit invalide" });
    }

    // Validation avec Joi
    const { error, value } = updateStockSchema.validate(req.body);
     if (error) {
      console.error("Erreur de validation Joi (updateStock):", error.details);
      // Retourner une réponse structurée pour l'erreur 400
      return res.status(400).json({ success: false, message: `Validation échouée: ${error.details[0].message}` });
    }

    const { quantity, operation } = value;

    const product = await Product.findOne({ _id: id, tenantId });
    if (!product) {
      // Retourner une réponse structurée pour l'erreur 404
      return res.status(404).json({ success: false, message: "Produit non trouvé ou non autorisé" });
    }

    // Mettre à jour le stock selon l'opération
    let newStock = product.stock;
    if (operation === "add") {
      newStock += quantity;
    } else if (operation === "subtract") {
      newStock -= quantity;
      if (newStock < 0) {
        // Option: retourner une erreur si stock insuffisant ou juste mettre à 0
        // return res.status(400).json({ success: false, message: "Stock insuffisant" });
        newStock = 0; // Pour l'instant, on met à 0
      }
    } else if (operation === "set") {
      newStock = quantity;
    }
    // Pas besoin de 'else' car Joi valide déjà l'opération

    product.stock = newStock;
    const updatedProduct = await product.save();
    // Retourner une réponse structurée en cas de succès (retour direct du mock/doc)
    return res.json({ success: true, message: "Stock mis à jour avec succès", product: updatedProduct });
  } catch (error) {
    console.error("Erreur dans updateStock:", error);
    return next(error);
  }
};

