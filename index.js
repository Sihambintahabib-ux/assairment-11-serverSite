const express = require("express");
const cors = require("cors");
require("dotenv").config();
const {
  MongoClient,
  ServerApiVersion,
  ObjectId,
  deserialize,
} = require("mongodb");
const admin = require("firebase-admin");
const port = process.env.PORT || 3000;
//add strine key :
const stripe = require("stripe")(process.env.STRIPE_KEY);

// vercel deploy
const decoded = Buffer.from(process.env.FB_SERVICE_KEY, "base64").toString(
  "utf-8"
);
const serviceAccount = JSON.parse(decoded);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const app = express();
// middleware
app.use(
  cors({
    origin: [
      process.env.CLIENT_URL,
      // "http://localhost:5173",
      // "http://localhost:5174",
      // "https://b12-m11-session.web.app",
    ],
    credentials: true,
    optionSuccessStatus: 200,
  })
);
app.use(express.json());

// jwt middlewares
const verifyJWT = async (req, res, next) => {
  const token = req?.headers?.authorization?.split(" ")[1];
  // console.log(token);
  if (!token) return res.status(401).send({ message: "Unauthorized Access!" });
  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.tokenEmail = decoded.email;
    // console.log(decoded);
    next();
  } catch (err) {
    // console.log(err);
    return res.status(401).send({ message: "Unauthorized Access!", err });
  }
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const url = process.env.MONGODB_URI;

const client = new MongoClient(url, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    //db collection: clubsCollection
    const db = client.db("clubsdb");
    const clubsCollection = db.collection("clubs"); // plantsCollection
    const eventsCollection = db.collection("events"); // plantsCollection
    const eventsRegistrationCollection = db.collection("eventsRegistration"); // plantsCollection
    const membershipsCollection = db.collection("memberships"); // ordersCollection
    const paymentsCollection = db.collection("payments");
    const userCollection = db.collection("users");
    //!=============Role Middleware===========!//

    // Role Middleware - admin
    const verifyAdmin = async (req, res, next) => {
      const email = req.tokenEmail;
      const user = await userCollection.findOne({ email });
      if (user?.role !== "admin")
        return res
          .status(403)
          .send({ message: "admin action!", role: user.role });
      next();
    };
    // Role Middleware - manager
    const verifyManager = async (req, res, next) => {
      const email = req.tokenEmail;
      const user = await userCollection.findOne({ email });
      if (user?.role !== "menager")
        return res
          .status(403)
          .send({ message: "menager action!", role: user.role });
      next();
    };

    //!=============search===========!//
    // app.get("/search", async (req, res) => {
    //   //**  start
    //   const searchText = req.query.searchText;
    //   const query = {};
    //   if (searchText) {
    //     query.clubName = { $regex: searchText, $options: "i" };
    //   }

    //   //* end

    //   console.log(searchText, query);
    //   const result = await clubsCollection
    //     .find(query)
    //     .sort({ createdAt: -1 })
    //     .toArray();
    //   // const result = await clubsCollection
    //   //   .find({ productName: { $regex: searchText, $options: "i" } })
    //   //   .sort({ createdAt: -1 })
    //   //   .toArray();
    //   res.send(result);
    // });
    //!=============START===========!//
    //!=============save users to db===========!//

    //* sava data of users login or signup to db in userCollection
    app.post("/user", async (req, res) => {
      const userData = req.body;

      //* existingUser
      const existingUser = await userCollection.findOne({
        email: userData.email,
      });
      const query = { email: userData.email };
      if (existingUser) {
        // return res.json({ success: true, user: existingUser });
        const result = await userCollection.updateOne(query, {
          $set: {
            lastloggedAt: new Date(),
          },
        });
        return res.send(result);
      }
      // console.log(result);
      // * newUser
      const result = await userCollection.insertOne(userData);
      console.log("userCollection============?", result);

      res.send(result);
    });
    //* get user role from userCollection
    app.get("/user/role", verifyJWT, async (req, res) => {
      // const email = req.params.email;
      // const email = email: req.tokenEmail ;

      const result = await userCollection.findOne({ email: req.tokenEmail });
      res.send({ role: result?.role });
    });
    //* get all user  from userCollection
    app.get("/user", verifyJWT, async (req, res) => {
      // const email = req.params.email;
      // const email = email: req.tokenEmail ;
      const email = req.tokenEmail;

      const result = await userCollection
        .find({ email: { $ne: email } })
        .toArray();
      res.send(result);
    });

    // * updata member role - admin
    app.patch("/updateRole/:id", verifyJWT, async (req, res) => {
      const { email, role, lastloggedAt } = req.body;
      // const clubId = req.params.id;

      // const email = req.params.email;
      const result = await userCollection.updateMany(
        { email: email },
        // { _id: new ObjectId(clubId) },
        { $set: { role, lastloggedAt: new Date() } }
      );
      console.log(result);
      res.send(result);
    });
    //!=============save add-events to db===========!//

    //* save add-events to db
    app.post("/events", verifyJWT, verifyManager, async (req, res) => {
      const eventData = req.body; //plantsdata =1.5
      // console.log(clubData);
      const result = await eventsCollection.insertOne(eventData);
      res.send(result);
    });

    // *get all events from db + search
    app.get("/events", async (req, res) => {
      const searchText = req.query.searchText; //* search
      const selectedCategory = req.query.selectedCategory; //* filter
      //**   search
      // const searchText = req.query.searchText;
      const query = {};
      if (searchText) {
        query.title = { $regex: searchText, $options: "i" };
      }

      //* filter
      if (selectedCategory && selectedCategory !== "all") {
        query.category = selectedCategory;
      }

      // * sort
      const sortMap = {
        newest: { eventDate: 1 },
        oldest: { eventDate: -1 },
        az: { title: 1 },
        za: { title: -1 },
        feelow: { membershipFee: 1 },
        feehigh: { membershipFee: -1 },
      };

      const sortQuery = sortMap[req.query.sort] || { createdAt: -1 };
      const result = await eventsCollection
        .find(query) // * add query in find for search
        .sort(sortQuery) // * add Sort in sort for Sort
        .toArray(); //* call the query in find
      // console.log(result);
      res.send(result);
    });

    //!

    // *get one events from db - eventdetails page
    app.get("/events/:id", async (req, res) => {
      const id = req.params.id;
      const result = await eventsCollection.findOne({ _id: new ObjectId(id) });
      // console.log("get - /clubs/:id", result);
      res.send(result);
    });
    //* create eventsRegistration and add members who registered for events
    app.post("/eventsRegistration", async (req, res) => {
      const eventData = req.body; //plantsdata =1.5
      // console.log(clubData);
      const result = await eventsRegistrationCollection.insertOne(eventData);
      res.send(result);
    });

    // !get all events from db admin
    app.get("/eventsRegistration", async (req, res) => {
      const result = await eventsRegistrationCollection.find().toArray();
      // console.log(result);
      res.send(result);
    });
    // ! get all events for a member by email
    app.get("/my-events", verifyJWT, async (req, res) => {
      // const email = req.params.email;
      // managerEmail;
      // userEmail;
      const result = await eventsRegistrationCollection
        .find({ userEmail: req.tokenEmail })
        .toArray();
      res.send(result);
    });
    //* get all events MEMBER for a manager by email
    app.get("/manage-eventsMember/:email", async (req, res) => {
      const email = req.params.email;
      // userEmail;
      // managerEmail;
      const result = await eventsRegistrationCollection
        .find({ managerEmail: email })
        .toArray();
      res.send(result);
    });
    //* get all events for a manager by email
    app.get("/manage-events/:email", async (req, res) => {
      const email = req.params.email;
      // clubsCollection
      const result = await eventsCollection
        .find({ managerEmail: email })
        .toArray();
      res.send(result);
    });
    // !NO :  get all events for a admin / also can use club db
    // app.get("/admin-events", async (req, res) => {
    //   // const email = req.params.email;
    //   const result = await eventsCollection.find().toArray();
    //   res.send(result);
    // });

    //!=============end===========!//

    //!============= search filter sort ===========!//
    //!============= search  ===========!//
    //* club search :
    //*event search :
    //!============= filter ===========!//
    //* club filter :
    //*event filter :
    //!============= sort ===========!//
    //* club sort :
    //*event sort :

    //!=============end===========!//

    //*save add-club to db
    app.post("/clubs", verifyJWT, verifyManager, async (req, res) => {
      const clubData = req.body; //plantsdata =1.5
      // console.log(clubData);
      const result = await clubsCollection.insertOne(clubData);
      res.send(result);
    });
    // *get all club from db + search
    app.get("/clubs", async (req, res) => {
      const searchText = req.query.searchText; //* search
      const selectedCategory = req.query.selectedCategory; //* filter
      // const selectedSort = req.query.selectedSort; //*sort
      // const SortOrder = req.query.SortOrder; //*order
      const { sort = "newest", order = "asc" } = req.query;

      console.log(req.query);
      // console.log(`SortOrder`, {
      //   // searchText,
      //   // selectedCategory,
      //   // selectedSort,
      //   // SortOrder,
      //   short,
      //   order,
      // });

      // const sortOption = {};
      // sortOption[short || "newest"] = order === "desc" ? -1 : 1;
      // if (short === "newest") sortOption.createdAt = -1;
      // else if (short === "oldest") sortOption.createdAt = 1;

      //* search :
      const query = {};
      if (searchText) {
        query.clubName = { $regex: searchText, $options: "i" };
      }
      //* filter
      if (selectedCategory && selectedCategory !== "all") {
        query.category = selectedCategory;
      }

      // * sort
      const sortMap = {
        newest: { createdAt: 1 },
        oldest: { createdAt: -1 },
        az: { clubName: 1 },
        za: { clubName: -1 },
        feelow: { membershipFee: 1 },
        feehigh: { membershipFee: -1 },
      };

      const sortQuery = sortMap[req.query.sort] || { createdAt: -1 };
      //*
      const result = await clubsCollection
        .find(query) // * add query in find for search
        .sort(sortQuery) // * add Sort in sort for Sort
        .toArray();

      // console.log(result);
      res.send(result);
    });
    // *get all paymenthistory from db - adbim
    app.get("/payment-history", async (req, res) => {
      const email = req.params.email;
      const result = await paymentsCollection.find().toArray();
      res.send(result);
    });
    // *get all paymenthistory from db - memberse
    app.get("/my-payment/:email", async (req, res) => {
      const email = req.params.email;
      const result = await paymentsCollection
        .find({ userEmail: email })
        .toArray();
      res.send(result);
    });

    // *get one club from db
    app.get("/clubs/:id", async (req, res) => {
      const id = req.params.id;
      const result = await clubsCollection.findOne({ _id: new ObjectId(id) });
      // console.log("get - /clubs/:id", result);
      res.send(result);
    });

    //* STRIPE Payment :
    app.post("/create-checkout-session", async (req, res) => {
      const paymentInfo = req.body;
      console.log("steipes", paymentInfo);
      // res.send(paymentInfo);

      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, price_1234) of the product you want to sell
            price_data: {
              currency: "usd",
              product_data: {
                // name: paymentInfo?.name, //clubName
                name: paymentInfo?.clubName, //clubName

                // description: paymentInfo.description, // comment - not needed
                // images: [paymentInfo?.images], //bannerImage comment - not needed
                images: [paymentInfo?.bannerImage], //bannerImage comment - not needed
              },
              // unit_amount: paymentInfo?.price * 100, //membershipFee
              unit_amount: paymentInfo?.membershipFee * 100, //membershipFee
            },
            quantity: 1, // comment - not needed
          },
        ],
        customer_email: paymentInfo?.userEmail, // userEmail
        mode: "payment",
        metadata: {
          // plantId: paymentInfo?.plantId, //clubId
          clubId: paymentInfo?.clubId, //clubId
          member_email: paymentInfo?.userEmail, // userEmail

          // status: paymentInfo?.status,
        },
        success_url: `${process.env.CLIENT_URL}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/clubs/${paymentInfo?.clubId}`,
      });
      // res.send(paymentInfo);
      res.send({ url: session.url });
    });

    //*save membership to membershipsCollection (after payment successfull) + save payment to paymentcollection db
    app.post("/payment-success", async (req, res) => {
      const { sessionId } = req.body;
      // const sessionIsssd = req.body;
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      // console.log("object", sessionIsssd);
      const club = await clubsCollection.findOne({
        _id: new ObjectId(session.metadata.clubId),
        // clubId: session.metadata.clubId,
      });

      // console.log(session);
      // console.log("club------->>>>>", club);
      //!
      // const clubId = session.metadata.clubId;
      // const userEmail = session.metadata.member_email;
      //!
      // * existingmember : check dublicate data
      const joinedmember = await membershipsCollection.findOne({
        // transactionId: session.payment_intent,
        // userEmail: session.metadata.member_email,
        // clubId: session.metadata.clubId,
        userEmail: session.metadata.member_email, //!
        clubId: session.metadata.clubId, //!
      });

      //!
      console.log("session.payment_intent", session.payment_intent);
      console.log(joinedmember);
      console.log("session.payment_intent", session.payment_intent);
      const query = { email: session.metadata.member_email };
      if (joinedmember) {
        const result = await membershipsCollection.updateOne(query, {
          $set: {
            joinedAt: new Date(),
            // expiresAt: new Date(),
            expiresAt: null,
          },
        });

        return res.send(result);
      }

      //!
      //!
      // if (joinedmember) {
      //   return res.status(400).json({
      //     success: false,
      //     message: "You are already a member of this club!",
      //   });
      // }
      //!

      //!
      // const duplicateTransaction = await membershipsCollection.findOne({
      //   transactionId: session.payment_intent,
      // });

      // if (duplicateTransaction) {
      //   return res.send({
      //     transactionId: session.payment_intent,
      //     joinedId: duplicateTransaction._id,
      //   });
      // }
      //!

      if (session.status === "complete" && club && !joinedmember) {
        // save data to db
        const membershipInfo = {
          clubId: session.metadata.clubId,
          clubName: club.clubName,
          // images00: club.images,
          userEmail: session.metadata.member_email,
          managerEmail: club?.managerEmail,

          status: "active",
          transactionId: session.payment_intent, //
          paymentId: session.id,
          membershipFee: session.amount_total / 100,
          // status: session,
          joinedAt: new Date(), // .toLocaleDateString("en-IN")
          // expiresAt: new Date(), // .toLocaleDateString("en-IN")
          expiresAt: "null", // .toLocaleDateString("en-IN")
          bannerImage: club.bannerImage,
          description: club.description,
          location: club.location,
          category: club.category,

          // membershipFeeFees00: club.unit_amount,
        };
        console.log("membershipInfo===========>", membershipInfo);

        const result = await membershipsCollection.insertOne(membershipInfo);
        //*
        // * SAVE TO PAYMENTS COLLECTION:
        const paymentRecord = {
          userEmail: session.metadata.member_email,
          amount: session.amount_total / 100,
          type: "membership",
          clubId: session.metadata.clubId,
          clubName: club.clubName,

          stripePaymentIntentId: session.payment_intent,
          status: "completed",
          createdAt: new Date().toLocaleDateString("en-IN"),
        };

        await paymentsCollection.insertOne(paymentRecord);
        //*
        return res.send({
          transactionId: session.payment_intent,
          joinedmemberId: result.insertedId,
        });
      }
      res.send({
        transactionId: session.payment_intent,
        joinedId: joinedmember._id,
      });
    });

    // * get all clubs for a member by email
    app.get("/my-clubs", verifyJWT, async (req, res) => {
      // const email = req.params.email;
      // managerEmail;
      // userEmail;
      const result = await membershipsCollection
        .find({ userEmail: req.tokenEmail })
        .toArray();
      res.send(result);
    });
    //* get all clubs MEMBER for a manager by email
    app.get("/manage-member/:email", async (req, res) => {
      const email = req.params.email;
      // userEmail;
      // managerEmail;
      const result = await membershipsCollection
        .find({ managerEmail: email })
        .toArray();
      res.send(result);
    });
    //* get all clubs for a manager by email
    app.get("/manage-clubs/:email", async (req, res) => {
      const email = req.params.email;
      // clubsCollection
      const result = await clubsCollection
        .find({ managerEmail: email })
        .toArray();
      res.send(result);
    });
    // ! get all clubs for a admin / also can use club db
    app.get("/admin-clubs", verifyJWT, async (req, res) => {
      // const email = req.params.email;
      const result = await clubsCollection.find().toArray();
      res.send(result);
    });
    //!============= admin club status updata  ===========!//

    // // * admin member role updata
    // app.patch("/updateRole/:id", verifyJWT, async (req, res) => {
    //   const { email, role, lastloggedAt } = req.body;
    //   // const clubId = req.params.id;

    //   // const email = req.params.email;
    //   const result = await userCollection.updateMany(
    //     { email: email },
    //     // { _id: new ObjectId(clubId) },
    //     { $set: { role, lastloggedAt: new Date() } }
    //   );
    //   console.log(result);
    //   res.send(result);
    // });
    // * admin club status updata - approved
    app.patch("/updateClubStatusApproved/:id", verifyJWT, async (req, res) => {
      const { email, status, updateAt } = req.body;
      const clubId = req.params.id;

      // const email = req.params.email;
      const result = await clubsCollection.updateMany(
        // {  managerEmail : email},
        { _id: new ObjectId(clubId) },
        { $set: { status, updateAt: new Date() } }
      );
      console.log(result);
      res.send(result);
    });
    // * admin club status updata - reject
    app.patch("/updateClubStatusReject/:id", verifyJWT, async (req, res) => {
      const { email, status, updateAt } = req.body;
      const clubId = req.params.id;
      const id = { _id: new ObjectId(clubId) };

      // const email = req.params.email;
      const result = await clubsCollection.updateMany(
        // {  managerEmail : email},
        { _id: new ObjectId(clubId) },
        { $set: { status, updateAt: new Date() } }
      );
      await clubsCollection.deleteOne(id);
      console.log(result);
      res.send(result);
    });

    //!=============end===========!//
    //!============= club and event - delete  ===========!//

    //*delete club
    app.delete("/club/:id", verifyJWT, async (req, res) => {
      const { email, status, updateAt } = req.body;
      const clubId = req.params.id;
      const id = { _id: new ObjectId(clubId) };
      const result = await clubsCollection.deleteOne(id);
      console.log(result);
      res.send(result);
    });
    //*delete event
    app.delete("/event/:id", verifyJWT, async (req, res) => {
      const clubId = req.params.id;
      const id = { _id: new ObjectId(clubId) };
      const result = await eventsCollection.deleteOne(id);
      console.log(result);
      res.send(result);
    });
    //!=============end===========!//
    //!============= club and event - update  ===========!//

    // //*update club
    // app.patch("/club/:id", verifyJWT, async (req, res) => {
    //   const clubId = req.params.id;
    //   const id = { _id: new ObjectId(clubId) };
    // const updateData = req.body; // const updateData = req.body;
    // const update = { $set: updateData };

    //   const result = await clubsCollection.updateOne(filter, update);
    //   console.log(result);
    //  res.send({
    //    success: true,
    //    result,
    //  });
    // });

    // const result = await productsCollection.updateOne(filter, update);
    // res.send({
    //   success: true,
    //   result,
    // });

    //*
    // //*update event
    // app.delete("/event/:id", verifyJWT, async (req, res) => {
    //   const clubId = req.params.id;
    //   const id = { _id: new ObjectId(clubId) };
    //   const result = await eventsCollection.deleteOne(id);
    //   console.log(result);
    //   res.send(result);
    // });
    // //*

    //*update export product :
    // app.put("/products/:id", async (req, res) => {
    //   const { id } = req.params;
    //   const data = req.body;
    //   // console.log(data);
    //   // console.log(id);
    //   const ObjId = new ObjectId(id);
    //   const filter = { _id: ObjId };
    //   const update = { $set: data };

    //   const result = await productsCollection.updateOne(filter, update);
    //   res.send({
    //     success: true,
    //     result,
    //   });
    // });
    //*
    //!=============end===========!//

    // // get all clubs for a admin by email
    // app.get("/admin-clubs/:email", async (req, res) => {
    //   const email = req.params.email;

    //   const result = await clubsCollection.find({ userEmail: email }).toArray();
    //   res.send(result);
    // });
    //!=============END===========!//
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello from Server..assairment 11");
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
