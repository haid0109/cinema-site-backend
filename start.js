const express = require('express');
const mongoose = require('mongoose');
const app = express();

app.on('ready', () => {
    app.listen(2020);
    console.log('app has started');
});

mongoose.connect("mongodb://haidar:Passw0rd@localhost:27017/cinemaDB", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
});

mongoose.connection.once('open', () => {
    console.log("connected to DB");
    app.emit('ready');
});