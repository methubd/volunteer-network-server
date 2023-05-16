const express = require('express');
const cors = require('cors');
require('dotenv').config()
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
var jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 5000;

//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster1.some2ew.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if(!authorization){
    return res.status(401).send({error: true, message: 'Unauthorized Access'})
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.SECRET_CODE, (error, decoded) => {
    if(error){
      return res.status(401).send({error: true, message: 'Unauthorized Access'})
    }
    res.decoded = decoded;
    next();
  })
}

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    const eventCollection = client.db('volunteerNetworkDB').collection('events');
    const volunteerCollection = client.db('volunteerNetworkDB').collection('volunteers')
    const bookingCollection = client.db('volunteerNetworkDB').collection('bookings')

    //jwt
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_CODE, {
        expiresIn: '1h'
      })
      res.send({token});
    })    

    //showing bookings to user
    app.get('/bookings', verifyJWT, async (req, res) => {
      
      let query = {}

      if(req.query.email){
        query = {userEmail: req.query.email}
      }

      const result = await bookingCollection.find(query).toArray()
      res.send(result)
    })

    //deleting bookings by use id
    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await bookingCollection.deleteOne(query)
      res.send(result)
    })
    
    //putting bookings to go to a new event (POST method)
    app.post('/bookings', async (req, res) => {
      const newBooking = req.body;
      const result = await bookingCollection.insertOne(newBooking);
      res.send(result)
    })

    //getting a new volunteer (POST method)
    app.post('/volunteers', async (req, res) => {
      const newVolunteer = req.body;
      console.log(newVolunteer);
      const result = await volunteerCollection.insertOne(newVolunteer);
      res.send(result)
    })

    //updating the event details
    app.put('/events/:id', async (req, res) => {
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const options = {upsert: true}
      const oldEvent = req.body;

      const updatedEvent = {
        $set:{
          title: oldEvent.title,
          date: oldEvent.date,
          description: oldEvent.description,
          image: oldEvent.image
        }
      }

      const result = await eventCollection.updateOne(filter, updatedEvent, options)
      res.send(result)
    })

    //showing all events to client
    app.get('/events', async (req, res) => {
        const result = await eventCollection.find().toArray()
        res.send(result);
    })

    // getting a single event
    app.get('/events/:id', async (req, res) => {
      const id = req.params.id;
      const query = {_id: new ObjectId(id)}
      const result = await eventCollection.findOne(query)
      res.send(result)
    })

    //adding new events to db
    app.post('/events', async (req, res) => {
        const newEvent = req.body;
        const result = await eventCollection.insertOne(newEvent);
        res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Volunteer Network Server')
})

app.listen(port, () => {
    console.log(`Volunteer Network Server is running on port ${port}`);
})