const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());

app.on('ready', () => {
    app.listen(2020);
    console.log('app has started');
});

mongoose.connect('mongodb://haidar:Passw0rd@localhost:27017/cinemaDB', {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true
});

mongoose.connection.once('open', () => {
    console.log('connected to DB');
    app.emit('ready');
});

let Person;
function setup(){
    let personSchema = new mongoose.Schema({
        name: String,
        age: Number,
        married: Boolean,
    });
    Person = mongoose.model('Person', personSchema);
}
setup();

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
})

app.delete('/person/:name', async (req, res) => {
    let name = req.params.name;
    Person.findOneAndRemove({'name': name})
    .then(() => res.send())
    .catch((err) => {
        console.log('failed to delete person');
        res.status(500).send();
    })
})