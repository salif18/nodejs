const express = require("express");
const Router = express.Router();

const Reset_Controller = require("../controller/reset_controller");


Router.post("/reset_token",Reset_Controller.reset);
Router.post("/reset_valid",Reset_Controller.valide);
Router.put("/update_password/:userId",Reset_Controller.updatePassword);

module.exports = Router;