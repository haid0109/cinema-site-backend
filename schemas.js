const mongoose = require('mongoose');
const {v4: uuidv4} = require('uuid');

module.exports = function(connection){
    const StaffSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
            unique: true
        },
        email: {
            type: String,
            required: true,
            unique: true
        },
        password: {
            type: String,
            required: true
        },
        phoneNum: {
            type: Number,
            required: true,
            unique: true
        },
        fullName: {
            type: String,
            required: true
        }
    });
    this.Staff = connection.model('staff', StaffSchema);

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