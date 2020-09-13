const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const upload = multer({storage: multer.memoryStorage()});

module.exports.start = async function start(app, User, Cinema, Movie){
    app.post('/cinema', async (req, res) => {
        Cinema.create(req.body)
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to create cinema: ', err);
            res.status(500).send();
        });
    });

    app.get('/cinema/names', async (req, res) => {
        Cinema.find({}, 'name')
        .then((names) => res.send(names))
        .catch((err) => {
            console.log('failed to retrieve cinema names: ', err);
            res.status(500).send();
        });
    });

    app.post('/movie', async (req, res) => {
        Movie.create(req.body)
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to create movie: ', err);
            res.status(500).send();
        });
    });

    app.get('/movie/names', async (req, res) => {
        Movie.find({}, 'name')
        .then((names) => res.send(names))
        .catch((err) => {
            console.log('failed to retrieve movie names: ', err);
            res.status(500).send();
        });
    });

    app.get('/movie/cards/:movieId/:cinema/:dateRange', async (req, res) => {
        const movieId = req.params.movieId;
        const cinema = req.params.cinema;
        const dateRange = req.params.dateRange;

        Movie.aggregate([
            {'$match': {'_id': movieId}},
            {'$project': {
                'title': true,
                'cover': true,
                'length': true,
                'performances': {'$filter': {
                    'input': '$performances',
                    'as': 'performance',
                    'cond': {
                        '$and': [
                            {'$eq': ['$$performance.cinema', cinema]},
                            {'$gte': ['$$performance.start', dateRange.dayStart]},
                            {'$lte': ['$$performance.start', dateRange.dayEnd]}
                        ]
                    }
                }}
            }}
        ])
        .then((cards) => res.send(cards))
        .catch((err) => {
            console.log('failed to retrieve movie cards: ', err);
            res.status(500).send();
        });
    });

    app.post('/movie/performance/:movieId', async (req, res) => {
        const movieId = req.params.movieId;

        try {
            const movie = await Movie.findOne({'_id': movieId});

            movie.performances.push(req.body);
            await movie.save();
    
            res.send();
        } catch (err) {
            console.log('failed to create performance: ', err);
            res.status(500).send();
        }
    });

}
