const express = require('express');
const mongoose = require('mongoose');
const Models = require('./schemas');
const Endpoints = require('./endpoints');
const app = express();

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
    this.Movie = models.Movie;
}

Application.prototype.start = async function start(){
    Endpoints.start(app, this.Movie);
}

app.use(express.json());
app.listen(2020, async () => {
    const application = new Application();
    await application.initialize();
    await application.start();
});
