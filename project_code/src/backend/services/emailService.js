// backend/services/emailService.js
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

// Configuration du transporteur d'emails
const createTransporter = () => {
  // En environnement de développement, utiliser un transporteur de test
  if (process.env.NODE_ENV !== 'production') {
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email', // Service de test Ethereal
      port: 587,
      secure: false,
      auth: {
        user: process.env.TEST_EMAIL_USER || 'test@example.com',
        pass: process.env.TEST_EMAIL_PASS || 'testpassword'
      }
    });
  }
  
  // En production, utiliser un vrai service SMTP
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

/**
 * Envoie un email
 * @param {Object} options - Options d'email
 * @param {string} options.to - Destinataire
 * @param {string} options.subject - Sujet de l'email
 * @param {string} options.text - Contenu texte de l'email
 * @param {string} [options.html] - Contenu HTML de l'email (optionnel)
 * @returns {Promise<Object>} - Résultat de l'envoi
 */
export const sendEmail = async (options) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_FROM || 'Branda <noreply@branda.app>',
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html
    };
    
    // En développement, simuler l'envoi et logger les informations
    if (process.env.NODE_ENV !== 'production') {
      console.log('=== EMAIL SIMULÉ ===');
      console.log(`À: ${mailOptions.to}`);
      console.log(`Sujet: ${mailOptions.subject}`);
      console.log(`Contenu: ${mailOptions.text}`);
      console.log('====================');
      
      // Retourner un résultat simulé
      return {
        accepted: [options.to],
        rejected: [],
        response: 'Email simulé en environnement de développement',
        messageId: `<simulated-${Date.now()}@branda.app>`
      };
    }
    
    // En production, envoyer réellement l'email
    const info = await transporter.sendMail(mailOptions);
    return info;
    
  } catch (error) {
    console.error('Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

export default {
  sendEmail
};
