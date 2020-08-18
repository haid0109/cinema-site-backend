const express = require('express');
const mongoose = require('mongoose');

await mongoose.connect("mongodb://haidar:Passw0rd@localhost:27017/cinemaDB", {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
});

const app = express();
app.listen(2020);