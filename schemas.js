const mongoose = require('mongoose');
const {v4: uuidv4} = require('uuid');

module.exports = function(connection){
    const CinemaSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
        },
        address: {
            type: String,
            required: true,
            unique: true
        },
        numOfStaff: Number,
        numOfHalls: Number
    });
    this.Cinema = connection.model('cinema', CinemaSchema);

    const StaffSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
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

    const UserSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
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
            unique: true
        },
        fullName: String
    });
    this.User = connection.model('user', UserSchema);

    const SeatSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
        },
        type: {
            type: String,
            required: true,
            enum: ['Normal', 'VIP', 'Couple']
        }
    });

    const RowSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
            unique: true
        },
        type: [SeatSchema]
    });

    const HallSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
        location: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
            unique: true
        },
        type: [RowSchema]
    });
    this.Hall = connection.model('hall', HallSchema);

    const MovieSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ['coming soon', 'in cinemas', 'expired']
        },
        length: Date,
        bio: String,
        releaseDate: Date,
        cover: Buffer,
        trailer: String,
        rating: {
            type: String,
            enum: ['G', 'PG', 'PG-13', 'R', 'NC-17']
        },
        genre: {
            type: [String],
            enum: [
                'Action', 
                'Drama', 
                'Adventure', 
                'Comedy', 
                'Animation',
                'Sci-Fi',
                'Fantasy',
                'Crime',
                'Thriller',
                'Family',
                'Romance',
                'Mystery',
                'Sport',
                'Horro',
                'War',
                'History',
                'Music'
            ]
        }
    });
    this.Movie = connection.model('movie', MovieSchema);
    
    const TicketSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
        movieId: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        type: {
            type: String,
            required: true,
            enum: ['Normal', 'VIP', 'Couple']
        },
        address: {
            type: String,
            required: true
        },
        hall: {
            type: String,
            required: true
        },
        row: {
            type: String,
            required: true
        },
        seat: {
            type: String,
            required: true
        },
        movieSart: {
            type: Date,
            required: true
        },
        movieEnd: {
            type: Date,
            required: true
        },
        movieLength: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            required: true,
            enum: ['Ready', 'Reserved', 'Sold']
        },
        phoneNum: Number,
        code: String,
    });
    this.Ticket = connection.model('ticket', TicketSchema);
}