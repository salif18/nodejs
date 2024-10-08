const Depense = require("../models/depenses_model")

exports.create = async (req, res) => {
    try {

        const { userId, montants, motifs } = await req.body;

        // Créer une nouvelle dépense
        const nouvelleDepense = new Depense({
            userId,
            montants: montants,
            motifs: motifs,
        });

        // Sauvegarder dans la base de données
        const results = await nouvelleDepense.save();

        return res.status(201).json(
            { message: 'Ajoutée !!', results:results },
        );
    } catch (err) {
        return res.status(500).json(
            { message: err.message },

        );
    }
}

exports.getDepenses = async (req, res) => {
    try {

        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json(
                { message: 'userId est requis' },
            );
        }
        // Récupérer toutes les dépenses triées par date de création décroissante
        const results = await Depense.find({ userId }).sort({ timestamps: -1 });

        // Calcul des dépenses
        const depensesTotal = results.reduce((total, depense) => total + depense.montants, 0);

        return res.status(200).json(
            { message: 'ok', results:results, depensesTotal:depensesTotal },
        );
    } catch (err) {
        return res.status(500).json(
            { message: 'Une erreur s\'est produite', error: err.message },
        );
    }
}


exports.delete = async (req, res) => {
    try {

        const { id } = req.params
        // Supprimer la dépense par son ID
        const results = await Depense.findByIdAndDelete(id);

        if (!results) {
            return res.status(404).json(
                { message: 'Dépense non trouvée' },
            );
        }

        return res.status(200).json(
            { message: 'Supprimée !!', results:results },
        );
    } catch (err) {
        return res.status(500).json(
            { message: 'Une erreur s\'est produite', error: err.message },
        );
    }
}

