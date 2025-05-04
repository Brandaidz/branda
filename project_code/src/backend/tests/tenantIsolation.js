// tests/tenantIsolation.js
import { runInTenantContext, getCurrentTenantId } from '../services/contextService.js';
import mongoose from 'mongoose';
import User from '../models/userModel.js';

/**
 * Script de test pour vérifier l'isolation des données entre tenants
 * avec la nouvelle implémentation AsyncLocalStorage
 */

// Fonction de test pour vérifier l'isolation des tenants
const testTenantIsolation = async () => {
  console.log('=== Test d\'isolation des tenants avec AsyncLocalStorage ===');
  
  // Simuler deux tenants différents
  const tenant1Id = new mongoose.Types.ObjectId();
  const tenant2Id = new mongoose.Types.ObjectId();
  
  console.log(`Tenant 1 ID: ${tenant1Id}`);
  console.log(`Tenant 2 ID: ${tenant2Id}`);
  
  // Test 1: Vérifier que getCurrentTenantId retourne le bon ID dans chaque contexte
  console.log('\n--- Test 1: Vérification de getCurrentTenantId ---');
  
  await runInTenantContext(tenant1Id, async () => {
    const currentTenant = getCurrentTenantId();
    console.log(`Dans le contexte du tenant 1, getCurrentTenantId() retourne: ${currentTenant}`);
    console.assert(currentTenant.toString() === tenant1Id.toString(), 
      'ERREUR: getCurrentTenantId ne retourne pas le bon ID pour tenant 1');
  });
  
  await runInTenantContext(tenant2Id, async () => {
    const currentTenant = getCurrentTenantId();
    console.log(`Dans le contexte du tenant 2, getCurrentTenantId() retourne: ${currentTenant}`);
    console.assert(currentTenant.toString() === tenant2Id.toString(), 
      'ERREUR: getCurrentTenantId ne retourne pas le bon ID pour tenant 2');
  });
  
  // Test 2: Vérifier l'isolation des requêtes imbriquées
  console.log('\n--- Test 2: Vérification de l\'isolation des requêtes imbriquées ---');
  
  await runInTenantContext(tenant1Id, async () => {
    console.log(`Contexte extérieur: tenant ${getCurrentTenantId()}`);
    
    // Requête imbriquée dans un autre contexte
    await runInTenantContext(tenant2Id, async () => {
      console.log(`Contexte imbriqué: tenant ${getCurrentTenantId()}`);
    });
    
    // Vérifier que le contexte extérieur est préservé
    console.log(`Retour au contexte extérieur: tenant ${getCurrentTenantId()}`);
    console.assert(getCurrentTenantId().toString() === tenant1Id.toString(), 
      'ERREUR: Le contexte extérieur n\'est pas préservé après une requête imbriquée');
  });
  
  // Test 3: Vérifier l'isolation des requêtes parallèles
  console.log('\n--- Test 3: Vérification de l\'isolation des requêtes parallèles ---');
  
  // Simuler des requêtes parallèles
  const promises = [
    runInTenantContext(tenant1Id, async () => {
      await new Promise(resolve => setTimeout(resolve, 100)); // Simuler un traitement
      const tenant = getCurrentTenantId();
      console.log(`Requête parallèle 1: tenant ${tenant}`);
      return tenant;
    }),
    
    runInTenantContext(tenant2Id, async () => {
      await new Promise(resolve => setTimeout(resolve, 50)); // Simuler un traitement plus court
      const tenant = getCurrentTenantId();
      console.log(`Requête parallèle 2: tenant ${tenant}`);
      return tenant;
    })
  ];
  
  const results = await Promise.all(promises);
  
  console.assert(results[0].toString() === tenant1Id.toString(), 
    'ERREUR: La requête parallèle 1 n\'a pas conservé son contexte');
  console.assert(results[1].toString() === tenant2Id.toString(), 
    'ERREUR: La requête parallèle 2 n\'a pas conservé son contexte');
  
  console.log('\n=== Tests d\'isolation des tenants terminés ===');
};

// Exécuter les tests
testTenantIsolation()
  .then(() => {
    console.log('Tests terminés avec succès');
    process.exit(0);
  })
  .catch(error => {
    console.error('Erreur lors des tests:', error);
    process.exit(1);
  });
