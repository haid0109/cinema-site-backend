const mongoose = require('mongoose');
const {v4: uuidv4, stringify} = require('uuid');
const otpGenerator = require('otp-generator');

module.exports = function(connection){
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
            type: String,
            unique: true,
            sparse: true
        }
    });
    this.User = connection.model('user', UserSchema);

    const StaffSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
        fullName: {
            type: String,
            required: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            sparse: true
        },
        password: {
            type: String,
            required: true
        },
        phoneNum: {
            type: String,
            required: true,
            unique: true,
            sparse: true
        },
        address: {
            type: String,
            required: true,
            unique: true,
            sparse: true
        },
    });

    const SeatSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
        }
    });

    const RowSchema = new mongoose.Schema({
        name: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            enum: ['Normal', 'VIP', 'Couple']
        },
        seats: [SeatSchema]
    });

    const HallSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        rows: [RowSchema]
    });

    const CinemaSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
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
        staff: [StaffSchema],
        halls: [HallSchema]
    });
    this.Cinema = connection.model('cinema', CinemaSchema);

    const TicketSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
        price: {
            type: Number,
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
        status: {
            type: String,
            required: true,
            enum: ['Ready', 'Reserved', 'Sold']
        },
        email: String,
        phoneNum: String,
        code: {
            type: String,
            default: () => otpGenerator.generate(6, {
                digits: true,
                alphabets: false,
                upperCase: false,
                specialChars: false
            }),
            required: true,
        },
    });

    const PerformanceSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
        start: {
            type: Date,
            required: true,
            unique: true,
            sparse: true
        },
        end: {
            type: Date,
            required: true,
            unique: true,
            sparse: true
        },
        cleanUpEnd: {
            type: Date,
            required: true,
            unique: true,
            sparse: true
        },
        prices: {
            normal: {
                type: Number,
                required: true
            },
            vip: {
                type: Number,
                required: true
            },
            couple: {
                type: Number,
                required: true
            }
        },
        numOfSeats: {
            type: Number,
            required: true,
        },
        seatsLeft: {
            type: Number,
            required: true,
        },
        status: {
            type: String,
            required: true,
            enum: ['Available', 'Sold Out', 'Expired']
        },
        cinemaId: {
            type: String,
            required: true,
        },
        address: {
            type: String,
            required: true,
        },
        hallId: {
            type: String,
            required: true,
        },
        tickets: [TicketSchema]
    });

    const MovieSchema = new mongoose.Schema({
        _id: {
            type: String,
            default: () => uuidv4(),
            required: true,
        },
        title: {
            type: String,
            required: true,
            unique: true
        },
        status: {
            type: String,
            required: true,
            enum: ['Coming Soon', 'In Cinemas', 'Expired']
        },
        length: String,
        bio: String,
        release: Date,
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
                'Horror',
                'War',
                'History',
                'Music'
            ]
        },
        performances: [PerformanceSchema]
    });
    this.Movie = connection.model('movie', MovieSchema);
}
