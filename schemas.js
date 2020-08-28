const mongoose = require('mongoose');
const {v4: uuidv4} = require('uuid');

module.exports = function(connection){
    const MovieSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true
        },
        name: String,
        length: Date
    });
    this.Movie = connection.model('movie', MovieSchema);
}