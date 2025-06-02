// services/taxi.service.js
const TaxiModel = require('../models/taxi.model');


exports.getDisponibles = async () => {
    return await TaxiModel.listDisponibles();
};