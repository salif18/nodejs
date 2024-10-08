const Produits = require("../models/produits_model");
const fs = require('fs');
const cloudinary = require("../middlewares/cloudinary")

exports.create = async (req, res, next) => {
    try {

        //valeur initial
        let imageUrl = "";
        let cloudinaryId = "";
        // Vérifier s'il y a un fichier
        if (req.file) {
            // Upload de l'image sur Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path);
            imageUrl = result.secure_url;
            cloudinaryId = result.public_id;
        }

        // Création d'un nouvel objet produit
        const nouveauProduit = new Produits({
            ...req.body,
            // STOKER IMAGE EN LOCAL
            // image: req.file ? `${req.protocol}://${req.get("host")}/images/${req.file.filename}` : "",
            image: imageUrl,  // URL Cloudinary renvoyée dans req.file.path
            userId: req.auth.userId,// Associer le produit à l'utilisateur
            cloudinaryId: cloudinaryId, // Enregistrer l'ID Cloudinary si nécessaire
        });
        // Sauvegarde du produit dans la base de données
        const produitSauvegarde = await nouveauProduit.save();

        // Retourner une réponse avec le produit sauvegardé
        return res.status(201).json({ message: "Ajouté", produits: produitSauvegarde });
    } catch (err) {

        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};

exports.getProduits = async (req, res) => {
    try {
        const { userId } = req.params

        if (!userId) {
            return res.status(400).json(
                { message: 'userId est requis' },
            );
        }

        const produits = await Produits.find({ userId }).sort({ date_achat: -1 });
        const totalAchat = produits.map((x) => x.prix_achat * x.stocks).reduce((a, b) => a + b, 0);

        // Calcule le nombre total de stocks
        const stocks = produits.reduce((acc, item) => acc + (item?.stocks || 0), 0);

        return res.status(200).json({ message: "OK", produits: produits, totalAchatOfAchat: totalAchat, stocks });
    } catch (err) {
        return res.status(500).json({ message: "Erreur", error: err.message });
    }
};

exports.getOneProduits = async (req, res) => {
    try {
        const { id } = req.params

        const produit = await Produits.findById(id);

        if (!produit) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        return res.status(200).json({ message: 'ok', produits: produit });
    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


exports.update = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ message: 'ID du produit manquant' });
        }

        const { nom, categories, prix_achat, prix_vente, stocks } = req.body;

        // Trouver le produit existant
        const produit = await Produits.findById(id);

        if (!produit) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }

        // Vérification d'autorisation
        if (produit.userId.toString() !== req.auth.userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }

        let imageUrl = produit.image; // Garder l'image actuelle si pas de mise à jour
        let cloudinaryId = produit.cloudinaryId; // Garder l'ancien Cloudinary ID si non modifié
        if (req.file) {
            // Si le produit a déjà une image associée, la supprimer sur Cloudinary
            if (produit.cloudinaryId) {
                await cloudinary.uploader.destroy(produit.cloudinaryId);
            }

            // Uploader la nouvelle image sur Cloudinary
            const result = await cloudinary.uploader.upload(req.file.path);
            imageUrl = result.secure_url; // URL sécurisée de la nouvelle image
            cloudinaryId = result.public_id; // ID Cloudinary de la nouvelle image
        }

        // Mise à jour du produit avec les nouvelles valeurs
        const produitMisAJour = await Produits.findByIdAndUpdate(
            id,
            {
                nom: nom ? nom : produit.nom,
                // STOCKER EN LOCAL
                // image: req.file ? `${req.protocol}://${req.get("host")}/images/${req.file.filename}` : produit.image,
                image: imageUrl, // URL Cloudinary renvoyée dans req.file.path
                cloudinaryId:cloudinaryId,
                categories: categories.length > 0 ? categories : produit.categories,
                prix_achat: prix_achat.length > 0 ? prix_achat : produit.prix_achat,
                prix_vente: prix_vente.length > 0 ? prix_vente : produit.prix_vente,
                stocks: stocks.length > 0 ? stocks : produit.stocks
            },
            { new: true } // retourne le document mis à jour
        );

        if (!produitMisAJour) {
            return res.status(400).json({ message: 'Erreur lors de la mise à jour du produit' });
        }

        return res.status(200).json({ message: 'Produit modifié avec succès', produits: produitMisAJour });

    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};


exports.delete = async (req, res) => {
    try {

        const { id } = req.params
        const produit = await Produits.findByIdAndDelete(id);

        if (!produit) {
            return res.status(404).json({ message: 'Produit non trouvé' });
        }


        if (produit.userId.toString() !== req.auth.userId) {
            return res.status(401).json({ message: 'Non autorisé' });
        }
        // METHODE SI LES FICHIER SON STOCKER EN LOCAL
        // const filename = produit.image.split('/images/')[1];
        // Supprimer l'image du serveur
        // fs.unlink(`public/images/${filename}`, async (err) => {
        //     if (err) {
        //         return res.status(500).json({ message: "Erreur lors de la suppression de l'image", error: err });
        //     }

        //     // Supprimer le produit après avoir supprimé l'image
        //     await produit.deleteOne({ _id: id });
        //     return res.status(200).json({ message: 'Produit supprimé avec succès' });
        // });

        //  Extraire l'identifiant public de l'image sur Cloudinary

        // Si le produit a un cloudinaryId, supprimer l'image sur Cloudinary
        if (produit.cloudinaryId) {
            await cloudinary.uploader.destroy(produit.cloudinaryId);
        }

        // Supprimer le produit
        await produit.deleteOne({ _id: id });
        // Si l'image est supprimée avec succès, supprimer le produit
        await produit.deleteOne({ _id: id });
        return res.status(200).json({ message: 'Produit et image supprimés avec succès' });



    } catch (err) {
        return res.status(500).json({ message: err.message });
    }
};