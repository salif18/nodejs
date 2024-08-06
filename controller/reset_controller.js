require("dotenv").config();
const bcrypt = require("bcrypt");
const Users = require("../models/user_model");

// Durée de blocage en millisecondes (1 heure)
const BLOCK_DURATION = 60 * 60 * 1000;

// Nombre maximal de tentatives
const TENTATIVES_MAX = 4;

// Fonction pour réinitialiser le token de l'utilisateur
exports.reset = async (req, res) => {
    try {
        const { numero, email } = req.body;

        // Vérifier l'existence de l'utilisateur
        const user = await Users.findOne({
            $and: [{ numero: numero }, { email: email }]
        });

        if (!user) {
            return res.status(401).json({
                message: "Cet utilisateur n'existe pas. Veuillez fournir le numéro et l'email avec lesquels vous vous êtes inscrit."
            });
        }

        // Vérifier si l'utilisateur est bloqué (a atteint le nombre maximum de tentatives)
        if (user.tentatives >= TENTATIVES_MAX && user.tentativesExpires > Date.now()) {
            // Convertir 'attemptExpires' en heure locale
            const tempsDattente = new Date(user.tentativesExpires).toLocaleString();
            return res.status(429).json({
                message: `Nombre maximal de tentatives atteint. Veuillez réessayer après ${tempsDattente}.`
            });
        }

        // Générer un nombre aléatoire de 4 chiffres
        const newToken = parseInt(Math.random() * 10000).toString().padStart(4, "0");

        // Mettre à jour le token de l'utilisateur
        user.remember_token = newToken;
        user.tentatives += 1;  // Incrémenter les tentatives
        if (user.tentatives >= TENTATIVES_MAX) {
            user.tentativesExpires = Date.now() + BLOCK_DURATION;  // Définir l'expiration si les tentatives maximales sont atteintes
        }
        await user.save();

        return res.status(200).json({
            message: `Veuillez entrer ce code ${newToken}`
        });
    } catch (err) {
        return res.status(500).json({
            err: err.message || 'Erreur serveur'
        });
    }
};

// Fonction pour valider le nouveau mot de passe
exports.valide = async (req, res) => {
    try {
        const { reset_token, new_password, confirm_password } = req.body;

        // Trouver l'utilisateur par token de réinitialisation
        const user = await Users.findOne({ remember_token: reset_token });

        if (!user) {
            return res.status(401).json({
                message: "Ce token a expiré"
            });
        }

        // Vérifier si les mots de passe correspondent
        if (new_password !== confirm_password) {
            return res.status(401).json({
                message: "Les deux mots de passe ne sont pas identiques"
            });
        }

        // Hasher le nouveau mot de passe
        const hashedNewPassword = await bcrypt.hash(new_password, 10);

        // Mettre à jour le mot de passe de l'utilisateur et réinitialiser le token
        user.password = hashedNewPassword;
        user.remember_token = null;
        user.tentatives = 0;  // Réinitialiser les tentatives en cas de succès
        user.tentativesExpires = Date.now();  // Réinitialiser l'expiration
        await user.save();

        return res.status(200).json({
            message: "Votre mot de passe a été modifié avec succès"
        });
    } catch (err) {
        return res.status(500).json({
            err: err.message || 'Erreur serveur'
        });
    }
};
