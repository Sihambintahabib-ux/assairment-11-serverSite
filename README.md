Github serverSite :  https://github.com/Sihambintahabib-ux/assairment-11-clientsite.git <br>
Github clientSite :  https://github.com/Sihambintahabib-ux/assairment-11-clientsite.git <br>
live link : http://sihambintahabib-assairment11.surge.sh/ <br>
Admin Gmail : admin@gmail.com <br>
Admin Password : admin@gmail.com <br>

## Backend installed

1. run : (package.json download )

```
npm init -y
```

2. add this line in package.json : `"start": "node index.js",`

```
 "scripts": {
    "start": "node index.js",
    "test": "echo \"Error: no test specified\" && exit 1"
  },
```

3. installed Express.js + cors + mongodb
   <br> link : https://expressjs.com/

```✅
npm i express cors mongodb
```

or

```❌
    npm install mongodb --save
```

Note : Express.js + cors add in the dependence 4. create a `.gitignore` file write `node_modules` file name

5. create index.js and add code in index.js:
   ![alt text](image.png)

```
const express = require('express')
const app = express()
//add cors : middleware
const cors = require("cors");

const port = process.env.PORT || 3000

//use middleware :
app.use(express.json());
app.use(cors());

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})

```

6. install nodemon : [what is nodemon and benefit of it]

```
    npm install -g nodemon
```

7. run to start code :

```
nodemon index.js
```

or :

```
node index.js
```

8. search : http://localhost:3000/

---

## mongodb cluster add:

1.  add mongodb cluster >drivers :

```
const { MongoClient, ServerApiVersion } = require('mongodb');
```

2.set url : ❌

```
const uri = "mongodb+srv://siham:<db_password>@cluster0.hohlyvu.mongodb.net/?appName=Cluster0";

```

- change username and paseword make it secure by set username and password from .env file : ✅

```
... ${process.env.db_users}:${process.env.db_passwrods}
```

3. client :

```
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
```

4.add functionality :

```
async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection

    //comment this line to deploy in vercel 1st line:
    //await client.db("admin").command({ ping: 1 });

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error

        //comment this line to deploy in vercel 2nd line:
    //await client.close();
  }
}
run().catch(console.dir);

```

5. create a database users : set user name and password : https://cloud.mongodb.com/v2/690778ec90d529421812921e#/security/database/users

6. set Build-in-role : admin

7. add IP address list to 0.0.0.0/0 give access from all ip address to the website : https://cloud.mongodb.com/v2/690778ec90d529421812921e#/security/network/accessList

---

## vercel deployment :

for serversite deployment : vercel

```
npm i -g vercel
```

```
vercel
```

```
vercel --prod
```

vercel environment variable set : [https://vercel.com/sihams-projects-0a3f7554/assairment11/settings/environment-variables]
[changer .env file server site url to vercel url]

## add .env file

env file:

```
 npm i dotenv
```

```
require("dotenv").config();
```

## sweetalert :

```
npm install sweetalert2
```

## firebase-admin security to backend data :

```
npm i firebase-admin
```

2. generate service key for ensure-security :

```

```

3. create a new file in serversite folder and download it
4. import it to index.js

## stripe

1. create a account
2. go to test mode
3. generate api keys
4. add stripe api keys in .env on serversite
5. download `npm install --save stripe`
6. import this :
7.

```
const stripe = require("stripe")(process.env.STRIPE_KEY);

```

[Note : import this after import this : `require("dotenv").config();` ]

8.

```
app.post('/create-checkout-session', async (req, res) => {
  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        // Provide the exact Price ID (for example, price_1234) of the product you want to sell
        price: '{{PRICE_ID}}',
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}?success=true`,
  });

```

9. or

```

```

- customer_email
- line_items

for more details :
https://docs.stripe.com/checkout/quickstart?lang=node&client=react
https://docs.stripe.com/api/checkout/sessions/create#create_checkout_session-line_items-price_data

---

## monogod $ne :

- $ne : use to remove a specific element.
  example :

```
  //* get all user  from userCollection
    app.get("/user", verifyJWT, async (req, res) => {

      const email = req.tokenEmail; // use jwt token to get user email

      const result = await userCollection
        .find({ email: { $ne: email } }) // use $ne in find : .find({ email: { $ne: email } })
        .toArray();
      res.send(result); // output : display all user data except login user data.
    });
```

- https://www.mongodb.com/docs/manual/reference/operator/query/ne/

---

## backend search by tanstack

1. backend : main seach code :

```
 app.get("/club", async (req, res) => {
      //**  start
      const searchText = req.query.searchText;
      const query = {};
      if (searchText) {
        query.clubName = { $regex: searchText, $options: "i" };
      }

      //* end

      console.log(searchText, query);
      const result = await clubsCollection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();

      res.send(result);
    });
```

---

- example from event code :

```

 //* save add-events to db
    app.post("/events", verifyJWT, verifyManager, async (req, res) => {
      const eventData = req.body; //plantsdata =1.5
      // console.log(clubData);
      const result = await eventsCollection.insertOne(eventData);
      res.send(result);
    });
    // *get all events from db
    app.get("/events", verifyJWT, async (req, res) => {
      //**  start
      const searchText = req.query.searchText;
      const query = {};
      if (searchText) {
        query.title = { $regex: searchText, $options: "i" };
      }

      //* end
      const result = await eventsCollection.find(query).toArray(); //* call the query in find
      // console.log(result);
      res.send(result);
    });
```

2. craete hook :

```
import { useEffect, useState } from "react";

const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value?.trim());
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export default useDebounce;


```

3. frontend : add search functionality in get event code :

```
const axiosSecure = useAxiosSecure();
  const [searchText, setsearchText] = useState(""); //*search state
  const Debounceseearch = useDebounce(searchText, 300); //*search hook Debounceseearch
  const {
    isLoading,
    isError,
    data: events = [],
    // refetch,
  } = useQuery({
    queryKey: ["events", Debounceseearch], //* Debounceseearch call for change
    queryFn: async () => {
      const result = await axiosSecure(
        `/events?searchText=${encodeURIComponent(
          Debounceseearch //*search url query
        )}`
      );
      return result.data;
    },
  });
  console.log({ events, Debounceseearch }); //* console Debounceseearch
```

4. add loading function before isloading

```
{isLoading ? (
          <LoadingSpinner></LoadingSpinner> //* search loading
        ) : isError ? (
          <ErrorPage></ErrorPage> //* search error
        ) : (
          events.map((data) => <EventCard key={data._id} data={data} />)
        )}
```

---

link :

- https://claude.ai/public/artifacts/0f28cf48-d9df-4243-8e57-bd77f3560420

---

##
