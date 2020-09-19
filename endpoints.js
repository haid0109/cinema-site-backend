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
                parsedMovie.release.substring(7, 5) - 1,
                parsedMovie.release.substring(10, 8)
            );
        }
        if(req.file) movieObj.cover = req.file.buffer;

        try {
            let movie = new Movie(movieObj);
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
                    parsedMovie.release.substring(7, 5) - 1,
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

    app.get('/movie/cards/:movieId/:cinemaId/:dateRange', async (req, res) => {
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

}
