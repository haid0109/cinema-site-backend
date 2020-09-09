module.exports.start = async function start(app, User, Cinema, Movie){
    app.get('/cinema/names', async (req, res) => {
        Cinema.find({}, 'name')
        .then((names) => res.send(names))
        .catch((err) => {
            console.log('failed to retrieve cinema names');
            res.status(500).send();
        });
    });

    app.post('/cinema', async (req, res) => {
        Cinema.create({
            'name': req.body.name,
            'address': req.body.address,
        })
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to create cinema');
            res.status(500).send();
        })
    });

    app.get('/movie/names', async (req, res) => {
        Movie.find({}, 'name')
        .then((names) => res.send(names))
        .catch((err) => {
            console.log('failed to retrieve movie names');
            res.status(500).send();
        });
    });

    app.get('/people', async (req, res) => {
        Person.find()
        .then((people) => res.send(people))
        .catch((err) => {
            console.log('failed to retrieve people');
            res.status(500).send();
        });
    });
    
    app.get('/person/:name', async (req, res) => {
        let name = req.params.name;
        Person.findOne({'name': name})
        .then((person) => {
            if(!person) return res.status(204).send('no person with that name');
            res.send(person);
        })
        .catch((err) => {
            console.log('failed to retrieve person');
            res.status(500).send();
        });
    });
    
    app.post('/person', async (req, res) => {
        Person.create({
            'name': req.body.name,
            'age': req.body.age,
            'married': req.body.married,
        })
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to create person');
            res.status(500).send();
        })
    });
    
    app.put('/person/:name', async (req, res) => {
        let name = req.params.name;
        Person.updateOne(
            {'name': name},
            {'$set':
                {
                    'name': req.body.name,
                    'age': req.body.age,
                    'married': req.body.married,
                }
            }
        )
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to update person info');
            res.status(500).send();
        })
    });
    
    app.delete('/person/:name', async (req, res) => {
        let name = req.params.name;
        Person.findOneAndRemove({'name': name})
        .then(() => res.send())
        .catch((err) => {
            console.log('failed to delete person');
            res.status(500).send();
        })
    });
}