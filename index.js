const express = require('express')
const app = express()
const cors = require('cors');
const jwt = require('jsonwebtoken');

const port = process.env.PORT || 5000;

require ('dotenv').config()
//middlewares
app.use(cors());
app.use(express.json());

// user : bistro-admin
//pass : XKCDAetoXDk5D5ia



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.pygokcx.mongodb.net/?retryWrites=true&w=majority`;

// console.log(uri);
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection

    const bistroUserCollection = client.db('bistroDB').collection('users');
    const bistroMenuCollection = client.db('bistroDB').collection('menu');
    const reviewCollection = client.db('bistroDB').collection('reviews');
    const cartsCollection = client.db('bistroDB').collection('carts');


    // jwt related api
    app.post('/jwt', async(req, res)=>{
      const user = req.body;
      // console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '1h'
    })
    res.send({token})
  })

  //middleware 
  // varify token
  const varifyToken = (req, res, next)=>{
     console.log('Inside varify token', req.headers.authorization);
    if(!req.headers.authorization){
      return res.status(401).send({message: "Unauthorized Access"})
    }
    const token = req.headers.authorization.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded)=>{
      if(err){
        return res.status(401).send({message: "Forbidden Access"})
      }
      req.decoded = decoded;
      next();
    })
    
  }

  // varify admin

  const varifyAdmin = async(req, res, next)=>{
    const email = req.decoded.email;
    const query = {email: email}
    const user = bistroUserCollection.findOne(query);
    const isAdmin = user?.role === "Admin";
    if(!isAdmin){
      return res.status(403).send({message: "Forbidden access"})

    }
    next();
  }


    // users related api
    app.post('/users', async(req, res)=>{
      // insert email in many ways
      // you can do this in many ways(1.unique email, upsert, simple checking)
      const user = req.body;
        // console.log(user);
      const query = {email: user.email}
      const existingUser = await bistroUserCollection.findOne(query);
      if(existingUser){
        return res.send({message : "User alredy exist", insertedId: null})
      }
      const result = await bistroUserCollection.insertOne(user);
      res.send(result)
     
    })

    app.get('/users', varifyToken, async(req, res)=>{
      console.log('Inside varify token', req.headers.authorization);
      const result = await bistroUserCollection.find().toArray();
      res.send(result);
    })

    app.delete('/users/:id', async(req, res)=>{
      const id = req.params.id;
      const query = {_id : new ObjectId(id)}
      const result = await bistroUserCollection.deleteOne(query);
      res.send(result); 
    })

    // set admin
    app.patch('/users/admin/:id', async(req, res)=>{
      const id = req.params.id;
      const filter = {_id: new ObjectId(id)}
      const updateDoc = {
        $set: {
          role : "Admin"
        }
      }
      const result = await bistroUserCollection.updateOne(filter, updateDoc);
      res.send(result)
    })

    // check admin
     app.get('/users/admin/:email',  async(req,res)=>{
      const email = req.params.email;
      // if(email !== req.decoded.email ){
      //   return res.status(403).send({message: 'Forbidden access'})
      // }
      const query = { email: email }
      const user = await bistroUserCollection.findOne(query);
      // console.log(user);
      let admin = false;
      if(user){
        admin = user?.role == "Admin";
      }
      res.send(admin);

    })

    //get all cart data 
    app.get('/carts', async(req, res)=>{
      const email =req.query.email;
      const query = {email: email};
      // console.log(query)
      // const cursor = cartsCollection.find();
      const result = await cartsCollection.find(query).toArray();
      res.send(result);
    })

    // carts collection
    app.post('/carts', async(req, res)=>{
      const newItem = req.body;
      const result = await cartsCollection.insertOne(newItem);
      res.send(result);
    })

    // delete cart item
    app.delete('/carts/:id', async(req, res)=>{
      const id = req.params.id;
      console.log(id);
      const query = {_id : new ObjectId(id)}
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    })


    app.get('/menu', async (req,res)=>{
        const result = await bistroMenuCollection.find().toArray();
        res.send(result);
    })
    app.get('/menu/:id', async(req, res)=>{
      const id = req.params.id;
      console.log('Get', id);
      const query = {_id : new ObjectId(id)};
      const result = await bistroMenuCollection.findOne(query);
      res.send(result);
    } )

    app.post('/menu', async(req, res)=>{
      const item = req.body;
      const result = await bistroMenuCollection.insertOne(item);
      res.send(result);
    } )
    app.delete('/menu/:id', async(req, res)=>{
      const id = req.params.id;
      console.log(id);
      const query = {_id : new ObjectId(id)};
      const result = await bistroMenuCollection.deleteOne(query);
      console.log(result);
      res.send(result)
    })

    app.get('/review', async (req,res)=>{
        const result = await reviewCollection.find().toArray();
        res.send(result);
    })

    // app.post('/admin/addItem')

    // naming convention
    //=================================
    /* 
    app.get('/users');
     app.get('/users/:id')
     app.post('/users');
     app.put('/users/:id')
     app.patch('/users/:id')
     app.delete('/users/:id')
     */
    




    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res)=>{
    res.send('Bistro-boss-server is running')
})

app.listen(port, ()=>{
    console.log(`Bistro-Boss-Server is Running on port : ${port}`)
})