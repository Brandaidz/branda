// backend/tests/roleTest.js
import request from 'supertest';
import app from '../server.js';
import User from '../models/userModel.js';
import { generateToken } from '../utils/tokenUtils.js';
import logger from '../config/logger.js';

/**
 * Script de test pour vérifier les autorisations basées sur les rôles
 * Teste l'accès aux différentes routes avec différents rôles utilisateur
 */

// Configuration des utilisateurs de test
const testUsers = {
  admin: {
    _id: '60d0fe4f5311236168a109ca',
    name: 'Admin Test',
    email: 'admin@test.com',
    role: 'admin',
    tenantId: 'tenant123'
  },
  manager: {
    _id: '60d0fe4f5311236168a109cb',
    name: 'Manager Test',
    email: 'manager@test.com',
    role: 'manager',
    tenantId: 'tenant123'
  },
  user: {
    _id: '60d0fe4f5311236168a109cc',
    name: 'User Test',
    email: 'user@test.com',
    role: 'user',
    tenantId: 'tenant123'
  }
};

// Routes à tester avec les rôles autorisés
const routesToTest = [
  { method: 'GET', path: '/api/products', allowedRoles: ['admin', 'manager', 'user'] },
  { method: 'POST', path: '/api/products', allowedRoles: ['admin', 'manager'] },
  { method: 'DELETE', path: '/api/products/123', allowedRoles: ['admin'] },
  { method: 'GET', path: '/api/sales/stats', allowedRoles: ['admin', 'manager'] },
  { method: 'POST', path: '/api/summary/optimize', allowedRoles: ['admin'] },
  { method: 'GET', path: '/api/performance/user/123', allowedRoles: ['admin', 'manager'] }
];

// Fonction pour générer un token JWT pour un utilisateur de test
const getTokenForUser = (user) => {
  return generateToken(user);
};

// Fonction principale de test
const runRoleTests = async () => {
  logger.info('Démarrage des tests de rôles et autorisations');

  for (const route of routesToTest) {
    logger.info(`Test de la route: ${route.method} ${route.path}`);
    
    for (const [roleName, userData] of Object.entries(testUsers)) {
      const token = getTokenForUser(userData);
      const isAllowed = route.allowedRoles.includes(roleName);
      
      logger.info(`  Test avec le rôle: ${roleName} (devrait être ${isAllowed ? 'autorisé' : 'refusé'})`);
      
      let response;
      const req = request(app).set('Authorization', `Bearer ${token}`);
      
      // Exécuter la requête selon la méthode
      switch (route.method) {
        case 'GET':
          response = await req.get(route.path);
          break;
        case 'POST':
          response = await req.post(route.path).send({});
          break;
        case 'PUT':
          response = await req.put(route.path).send({});
          break;
        case 'DELETE':
          response = await req.delete(route.path);
          break;
        default:
          logger.error(`Méthode non supportée: ${route.method}`);
          continue;
      }
      
      // Vérifier le statut de la réponse
      const expectedStatus = isAllowed ? [200, 201, 204] : [401, 403];
      const statusMatch = expectedStatus.includes(response.status);
      
      if (statusMatch) {
        logger.info(`  ✅ Test réussi: ${response.status} (${isAllowed ? 'autorisé' : 'refusé'})`);
      } else {
        logger.error(`  ❌ Test échoué: ${response.status} (attendu: ${expectedStatus.join(' ou ')})`);
      }
    }
  }
  
  logger.info('Tests de rôles et autorisations terminés');
};

// Exécuter les tests si ce fichier est exécuté directement
if (require.main === module) {
  runRoleTests()
    .then(() => {
      logger.info('Tests terminés avec succès');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Erreur lors des tests:', error);
      process.exit(1);
    });
}

export default runRoleTests;
