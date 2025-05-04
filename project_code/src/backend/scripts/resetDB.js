require("dotenv").config();
const bcrypt = require("bcrypt");
const connectDB = require("../config/db");
const User = require("../models/userModel");
const Conversation = require("../models/conversationModel");

const users = [
  {
    userId: "fastfood2025",
    password: "secret",
    businessData: {
      nom: "Casse-Croûte Express",
      typeCommerce: "fastfood",
      produits: [
        { name: "Tacos royal", price: 800 },
        { name: "Frites", price: 300 }
      ],
      employes: [{ name: "Karim", role: "Cuisinier" }]
    }
  },
  {
    userId: "salonelchic2025",
    password: "secret",
    businessData: {
      nom: "Salon El Chic",
      typeCommerce: "salon",
      produits: [
        { name: "Coupe homme", price: 1000 },
        { name: "Brushing", price: 1200 }
      ],
      employes: [{ name: "Yasmine", role: "Coiffeuse" }]
    }
  }
];

(async () => {
  await connectDB();
  await Conversation.deleteMany({});
  await User.deleteMany({});
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    await User.create({ ...u, passwordHash: hash });
  }
  console.log("✅ Base ré-initialisée avec 2 commerces tests (mot de passe: secret)");
  process.exit(0);
})();
