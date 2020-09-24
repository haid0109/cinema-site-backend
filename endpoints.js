const multer = require('multer');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

const upload = multer({storage: multer.memoryStorage()});

const verifyToken = async function(req, res, next) {
    if(!req.headers.authorization || !req.headers.role)
        return res.status(401).send({msg: 'you need to log in'});
    const token = req.headers.authorization.split(' ')[1];
    const role = req.headers.role;

    try {
        const decodedToken = jwt.verify(token, `cinemix top secret, ${role} secret key`);
        req._id = decodedToken._id;
    } catch (err) {
        if(err.message == 'invalid signature')
            return res.status(401).send({msg: 'you need to log in'});
        return res.status(500).send({msg: 'something went wrong, try again'});
    }

    next();
}

module.exports.start = async function start(app, User, Cinema, Movie){
    app.post('/user', async (req, res) => {
        try {
            req.body.password = bcrypt.hashSync(req.body.password, 10);
            const user = new User(req.body);
            const token = jwt.sign(
                {_id: user._id},
                'cinemix top secret, user secret key',
                {expiresIn: 86400}
            );
            await user.save();
            res.send(token);
        } catch (err) {
            console.log('failed to create user: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'email must be unique'});
            res.status(500).send();
        }
    });

    app.get('/user/login/:credentials', async (req, res) => {
        let credentials = {};
        try {credentials = JSON.parse(req.params.credentials);}
        catch (err) {
            console.log('failed to parse credentials: ', err);
            res.status(400).send();
        }

        User.findOne({email: credentials.email})
        .then((user) => {
            if(!user) return res.status(404).send({msg: 'user not found'});
            if(!bcrypt.compareSync(credentials.password, user.password))
                return res.status(400).send({msg: 'password is incorrect'});
            const token = jwt.sign(
                {_id: user._id},
                'cinemix top secret, user secret key',
                {expiresIn: 86400}
            );
            res.send(token);
        })
        .catch((err) => {
            console.log('failed to login user: ', err);
            res.status(500).send();
        });
    });

    app.post('/admin/:cinemaId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;
        try {
            req.body.password = bcrypt.hashSync(req.body.password, 12);
            let cinema = await Cinema.findOne({'_id': cinemaId});
            cinema.staff.push(req.body);
            await cinema.save();
            res.send();
        } catch (err) {
            console.log('failed to create admin: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'email must be unique'});
            res.status(500).send();
        }
    });

    app.get('/admin/:cinemaId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;

        Cinema.findOne(
            {
                '_id':  cinemaId,
                'staff._id': req._id
            },
            'staff.$'
        )
        .then((cinema) => {
            cinema.staff[0].password = '';
            res.send(cinema.staff[0]);
        })
        .catch((err) => {
            console.log('failed to retrieve admin: ', err);
            res.status(500).send();
        });
    });

    app.put('/admin/:cinemaId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;
        try {
            let query = {};
            if(req.body.fullName){query['staff.$.fullName'] = req.body.fullName;}
            if(req.body.email){query['staff.$.email'] = req.body.email;}
            if(req.body.password){
                req.body.password = bcrypt.hashSync(req.body.password, 12);
                query['staff.$.password'] = req.body.password;
            }
            if(req.body.phoneNum){query['staff.$.phoneNum'] = req.body.phoneNum;}
            if(req.body.address){query['staff.$.address'] = req.body.address;}

            await Cinema.updateOne(
                {'_id': cinemaId, 'staff._id': req._id},
                {
                    '$set': query
                }
            );

            res.send();
        } catch (err) {
            console.log('failed to update admin: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'email must be unique'});
            res.status(500).send();
        }
    });

    app.delete('/admin/:cinemaId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;
        try {
            let cinema = await Cinema.findOne({'_id': cinemaId});
            cinema.staff.pull(req.body._id);
            await cinema.save();
            res.send();
        } catch (err) {
            console.log('failed to delete admin: ', err);
            res.status(500).send();
        }
    });

    app.get('/admin/login/:cinemaId/:credentials', async (req, res) => {
        const cinemaId = req.params.cinemaId;
        let credentials = {};
        try {credentials = JSON.parse(req.params.credentials);}
        catch (err) {
            console.log('failed to parse credentials: ', err);
            res.status(400).send();
        }

        Cinema.findOne(
            {
                '_id': cinemaId,
                'staff.email': credentials.email
            },
            'staff.$'
        )
        .then((cinema) => {
            if(!cinema) return res.status(404).send({msg: 'user not found'});
            const admin = cinema.staff[0];
            if(!bcrypt.compareSync(credentials.password, admin.password))
                return res.status(400).send({msg: 'password is incorrect'});
            const token = jwt.sign(
                {_id: admin._id},
                'cinemix top secret, admin secret key',
                {expiresIn: 86400}
            );
            res.send(token);
        })
        .catch((err) => {
            console.log('failed to login admin: ', err);
            res.status(500).send();
        });
    });

    app.get('/admin/names/:cinemaId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;

        Cinema.findOne({'_id':  cinemaId}, 'staff')
        .then((cinema) => res.send(cinema.staff))
        .catch((err) => {
            console.log('failed to retrieve admin names: ', err);
            res.status(500).send();
        });
    });

    app.post('/movie', verifyToken, upload.single('cover'), async (req, res) => {
        let parsedMovie = JSON.parse(req.body.movie);
        let movieObj = {
            title: parsedMovie.title,
            status: parsedMovie.status,
            length: parsedMovie.length,
            bio: parsedMovie.bio,
            trailer: parsedMovie.trailer,
            rating: parsedMovie.rating,
            genre: parsedMovie.genre,
        }
        if(parsedMovie.release){
            movieObj.release = new Date(
                parsedMovie.release.substring(4, 0),
                +parsedMovie.release.substring(7, 5) - 1,
                parsedMovie.release.substring(10, 8)
            );
        }
        if(req.file) movieObj.cover = req.file.buffer;

        try {
            const movie = new Movie(movieObj);
            await movie.save();
            return res.send();
        } catch (err) {
            console.log('failed to create movie: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'title must be unique'});
            res.status(500).send();
        }
    });

    app.get('/movie/:movieId', async (req, res) => {
        const movieId = req.params.movieId;

        Movie.findOne({'_id':  movieId})
        .then((movie) => res.send(movie))
        .catch((err) => {
            console.log('failed to retrieve movies: ', err);
            res.status(500).send();
        });
    });

    app.put('/movie/:movieId', verifyToken, upload.single('cover'), async (req, res) => {
        const movieId = req.params.movieId;

        try {
            let parsedMovie = JSON.parse(req.body.movie);
            let movie = await Movie.findOne({'_id': movieId});
            if(!movie) return res.status(404).send({msg: 'movie does not exist'});

            if(parsedMovie.title) movie.title = parsedMovie.title;
            if(parsedMovie.status) movie.status = parsedMovie.status;
            if(parsedMovie.length) movie.length = parsedMovie.length;
            if(parsedMovie.bio) movie.bio = parsedMovie.bio;
            if(parsedMovie.trailer) movie.trailer = parsedMovie.trailer;
            if(parsedMovie.rating) movie.rating = parsedMovie.rating;
            if(parsedMovie.genre) movie.genre = parsedMovie.genre;
            if(parsedMovie.release){
                movie.release = new Date(
                    parsedMovie.release.substring(4, 0),
                    +parsedMovie.release.substring(7, 5) - 1,
                    parsedMovie.release.substring(10, 8)
                );
            }
            if(req.file) movie.cover = req.file.buffer;

            await movie.save();
            return res.send();
        } catch (err) {
            console.log('failed to update movie: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'title must be unique'});
            res.status(500).send();
        }
    });

    app.delete('/movie', verifyToken, upload.single('cover'), async (req, res) => {
        Movie.deleteOne({'_id': req.body._id})
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to delete movie: ', err);
            res.status(500).send();
        });
    });

    app.get('/movies/titles', async (req, res) => {
        Movie.find({}, 'title')
        .then((names) => res.send(names))
        .catch((err) => {
            console.log('failed to retrieve movie titles: ', err);
            res.status(500).send();
        });
    });

    app.get('/movie/cards/:cinemaId/:date', async (req, res) => {
        const cinemaId = req.params.cinemaId;
        const date = new Date(JSON.parse(req.params.date));
        const dateRange = {
            daystart: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
            dayEnd: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1)
        }

        Movie.aggregate([
            {'$project': {
                'title': true,
                'cover': true,
                'length': true,
                'performances': {'$filter': {
                    'input': '$performances',
                    'as': 'performance',
                    'cond': {
                        '$and': [
                            {'$eq': ['$$performance.cinemaId', cinemaId]},
                            {'$gte': ['$$performance.start', dateRange.daystart]},
                            {'$lte': ['$$performance.start', dateRange.dayEnd]}
                        ]
                    }
                }}
            }}
        ])
        .then((cards) => res.send(cards))
        .catch((err) => {
            console.log('failed to retrieve movie card: ', err);
            res.status(500).send();
        });
    });

    app.get('/movie/card/:movieId/:cinemaId/:dateRange', async (req, res) => {
        const movieId = req.params.movieId;
        const cinemaId = req.params.cinemaId;
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
                            {'$eq': ['$$performance.cinemaId', cinemaId]},
                            {'$gte': ['$$performance.start', dateRange.dayStart]},
                            {'$lte': ['$$performance.start', dateRange.dayEnd]}
                        ]
                    }
                }}
            }}
        ])
        .then((card) => res.send(card))
        .catch((err) => {
            console.log('failed to retrieve movie cards: ', err);
            res.status(500).send();
        });
    });

    app.post('/movie/performance/:movieId', verifyToken, async (req, res) => {
        const movieId = req.params.movieId;

        try {
            let movies = await Movie.find(
                {
                    'performances.cinemaId': req.body.cinemaId,
                    'performances.hallId': req.body.hallId
                },
                {
                    'status': 1,
                    'length': 1,
                    'performances': 1,
                }
            );
            let errorMessage = '';

            let startDateTime = new Date(
                req.body.startDate.substring(4, 0),
                +req.body.startDate.substring(7, 5) - 1,
                req.body.startDate.substring(10, 8),
                req.body.startTime.substring(2, 0),
                req.body.startTime.substring(5, 3),
            );
            movies.forEach(movie => {
                if(movie.status == 'Expired') errorMessage = 'Movie is expired';

                let cleanUpEndDateTime = new Date(startDateTime);
                cleanUpEndDateTime.setHours(
                    startDateTime.getHours() + +movie.length.substring(2, 0) + 1,
                    startDateTime.getMinutes() + +movie.length.substring(5, 3)
                );
                if(movie._id == movieId && !movie.length)
                    errorMessage = 'Cannot create performance without a movie length';

                if(movie.performances.length > 0){
                    movie.performances.forEach(performance => {
                        if(
                            (
                                startDateTime >= performance.start
                                &&
                                startDateTime < performance.cleanUpEnd
                            )
                            ||
                            (
                                cleanUpEndDateTime > performance.start
                                &&
                                cleanUpEndDateTime <= performance.cleanUpEnd
                            )
                            ||
                            (
                                startDateTime < performance.start
                                &&
                                cleanUpEndDateTime > performance.cleanUpEnd
                            )
                        ) errorMessage = 'Start time overlaps with another performance in the same hall';
                    });
                }
            });
            if(errorMessage) return res.status(403).send({msg: errorMessage})

            const cinema = await Cinema.findOne(
                {
                    '_id': req.body.cinemaId,
                    'halls._id': req.body.hallId
                },
                {
                    'address': 1,
                    'halls.$': 1
                }
            );
            let tickets = [];

            cinema.halls[0].rows.forEach(row => {
                row.seats.forEach(seat => {
                    let ticket = {};

                    if(row.type == 'Normal') ticket.price = req.body.prices.normal;
                    else if(row.type == 'VIP') ticket.price = req.body.prices.vip;
                    else ticket.price = req.body.prices.couple;
                    ticket.row = row.name;
                    ticket.seat = seat.name;
                    ticket.status = 'Ready';

                    tickets.push(ticket);
                });
            });

            let movie = await Movie.findOne({'_id': movieId});

            let cleanUpEndDateTime = new Date(startDateTime);
            cleanUpEndDateTime.setHours(
                startDateTime.getHours() + +movie.length.substring(2, 0) + 1,
                startDateTime.getMinutes() + +movie.length.substring(5, 3)
            );

            let endDateTime = new Date(cleanUpEndDateTime);
            endDateTime.setHours(endDateTime.getHours() - 1);

            let numOfSeats = 0;
            cinema.halls[0].rows.forEach(row => numOfSeats += row.seats.length);

            let performance = {};
            performance.start = startDateTime;
            performance.end = endDateTime;
            performance.cleanUpEnd = cleanUpEndDateTime;
            performance.prices = req.body.prices;
            performance.numOfSeats = numOfSeats;
            performance.seatsLeft = numOfSeats;
            performance.status = 'Available';
            performance.cinemaId = cinema._id;
            performance.address = cinema.address;
            performance.hallId = req.body.hallId;
            performance.tickets = tickets;

            movie.performances.push(performance);
            await movie.save();

            res.send();
        } catch (err) {
            console.log('failed to create performance: ', err);
            res.status(500).send();
        }
    });

    app.get('/movie/performances/names/:movieId', async (req, res) => {
        const movieId = req.params.movieId;

        try {
            let movie = await Movie.findOne(
                {'_id':  movieId},
                {
                    'performances._id': 1,
                    'performances.start': 1,
                    'performances.cleanUpEnd': 1
                }
            );
            res.send(movie.performances)
        } catch (err) {
            console.log('failed to retrieve performances: ', err);
            res.status(500).send();
        }
    });

    app.get('/movie/performance/:movieId/:performanceId', async (req, res) => {
        const movieId = req.params.movieId;
        const performanceId = req.params.performanceId;

        Movie.findOne(
            {
                '_id':  movieId,
                'performances._id': performanceId
            },
            'performances.$'
        )
        .then((movie) => res.send(movie.performances[0]))
        .catch((err) => {
            console.log('failed to retrieve performance: ', err);
            res.status(500).send();
        });
    });

    app.put('/movie/performance/:movieId/:performanceId', verifyToken, async (req, res) => {
        const movieId = req.params.movieId;
        const performanceId = req.params.performanceId;

        Movie.updateOne(
            {'_id': movieId, 'performances._id': performanceId},
            {
                '$set': {'performances.$.status': req.body.status}
            }
        )
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to update performance: ', err);
            res.status(500).send();
        });
    });

    app.delete('/movie/performance/:movieId', verifyToken, async (req, res) => {
        const movieId = req.params.movieId;
        try {
            let movie = await Movie.findOne({'_id': movieId});
            movie.performances.pull(req.body._id);
            await movie.save();
            res.send();
        } catch (err) {
            console.log('failed to delete performance: ', err);
            res.status(500).send();
        }
    });

    app.post('/cinema', verifyToken, async (req, res) => {
        try {
            const cinema = new Cinema(req.body);
            await cinema.save();
            return res.send();
        } catch (err) {
            console.log('failed to create cinema: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'name and address must be unique'});
            res.status(500).send();
        }
    });

    app.get('/cinema/:cinemaId', async (req, res) => {
        const cinemaId = req.params.cinemaId;

        Cinema.findOne({'_id':  cinemaId})
        .then((cinema) => res.send(cinema))
        .catch((err) => {
            console.log('failed to retrieve cinema: ', err);
            res.status(500).send();
        });
    });

    app.put('/cinema/:cinemaId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;

        try {
            let cinema = await Cinema.findOne({'_id': cinemaId});
            if(!cinema) return res.status(404).send({msg: 'cinema does not exist'});
            if(req.body.name) cinema.name = req.body.name;
            if(req.body.address) cinema.address = req.body.address;

            await cinema.save();
            return res.send();
        } catch (err) {
            console.log('failed to update cinema: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'name and address must be unique'});
            res.status(500).send();
        }
    });

    app.delete('/cinema', verifyToken, async (req, res) => {
        Cinema.deleteOne({'_id': req.body._id})
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to delete movie: ', err);
            res.status(500).send();
        });
    });

    app.get('/cinemas/names', async (req, res) => {
        Cinema.find({}, 'name')
        .then((names) => res.send(names))
        .catch((err) => {
            console.log('failed to retrieve cinema names: ', err);
            res.status(500).send();
        });
    });

    app.post('/cinema/hall/:cinemaId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;

        try {
            let cinema = await Cinema.findOne({'_id': cinemaId});
            cinema.halls.push(req.body);
            await cinema.save();
            res.send();
        } catch (err) {
            console.log('failed to create hall: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'hall name must be unique'});
            res.status(500).send();
        }
    });

    app.get('/cinema/hall/:cinemaId/:hallId', async (req, res) => {
        const cinemaId = req.params.cinemaId;
        const hallId = req.params.hallId;

        Cinema.findOne(
            {
                '_id':  cinemaId,
                'halls._id': hallId
            },
            'halls.$'
        )
        .then((cinema) => res.send(cinema.halls[0]))
        .catch((err) => {
            console.log('failed to retrieve cinema: ', err);
            res.status(500).send();
        });
    });

    app.put('/cinema/hall/:cinemaId/:hallId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;
        const hallId = req.params.hallId;

        try {
            let query = {};
            if(req.body.name){query['halls.$.name'] = req.body.name;}
            if(req.body.rows.length > 0){query['halls.$.rows'] = req.body.rows;}

            await Cinema.updateOne(
                {'_id': cinemaId, 'halls._id': hallId},
                {
                    '$set': query
                }
            );

            res.send();
        } catch (err) {
            console.log('failed to update admin: ', err);
            if(err.name == 'MongoError' && err.code == 11000)
                return res.status(403).send({msg: 'email must be unique'});
            res.status(500).send();
        }
    });

    app.delete('/cinema/hall/:cinemaId', verifyToken, async (req, res) => {
        const cinemaId = req.params.cinemaId;
        try {
            let cinema = await Cinema.findOne({'_id': cinemaId});
            cinema.halls.pull(req.body._id);
            await cinema.save();
            res.send();
        } catch (err) {
            console.log('failed to delete hall: ', err);
            res.status(500).send();
        }
    });

    app.get('/cinema/halls/names/:cinemaId', async (req, res) => {
        const cinemaId = req.params.cinemaId;

        Cinema.findOne(
            {'_id':  cinemaId},
            {
                'halls.name': 1,
                'halls._id': 1
            }
        )
        .then((cinema) => res.send(cinema.halls))
        .catch((err) => {
            console.log('failed to retrieve halls names: ', err);
            res.status(500).send();
        });
    });
}
