const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');

const Models = require('./schemas');
const Endpoints = require('./endpoints');

const app = express();
const upload = multer({storage: multer.memoryStorage()});

const Application = module.exports = function(){
    this.mongoose = mongoose.createConnection('mongodb://haidar:Passw0rd@localhost:27017/cinemaDB', {
        useNewUrlParser: true,
        useCreateIndex: true,
        useFindAndModify: false,
        useUnifiedTopology: true
    });
}

Application.prototype.initialize = async function initialize(){
    await this.mongoose;
    const models = new Models(this.mongoose);
    this.User = models.User;
    this.Cinema = models.Cinema;
    this.Movie = models.Movie;
}

Application.prototype.start = async function start(){
    Endpoints.start(app, upload, this.User, this.Cinema, this.Movie);
}

app.use(function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    next();
});
app.use(express.json());
app.listen(2020, async () => {
    const application = new Application();
    await application.initialize();
    await application.start();
});
