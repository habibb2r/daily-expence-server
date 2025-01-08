const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.ir3lm70.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const userCollection = client.db("dailyExpenses").collection("users");
    const accountingCollection = client
      .db("dailyExpenses")
      .collection("accounting");

    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.post("/authenticateUser", async (req, res) => {
      const user = req.body;
      console.log(user);
      const query = { employeeId: user.employeeId, password: user.password };
      console.log(query);
      const result = await userCollection.findOne(query);
      if (result) {
        return res.send({ status: true, email: result.email });
      }
      res.send({ status: false });
    });

    app.get("/profile", async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await userCollection.findOne(query);
      res.send(result);
    });

    app.post("/accounting", async (req, res) => {
      const accountingData = req.body;
      accountingData.createdAt = new Date();
      const result = await accountingCollection.insertOne(accountingData);
      res.send(result);
    });

    app.get("/dailyReports", async (req, res) => {
      const user = req.query.email;
      const date = new Date();
      const formattedDate = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      const query = { email: user, date: formattedDate };
      const result = await accountingCollection.find(query).toArray();
      res.send(result);
    });
    app.get("/dashboardData", async (req, res) => {
      const user = req.query.email;
      const query = { email: user };

      try {
        const result = await accountingCollection.find(query).toArray();
        console.log(result);

        const totalAmount = result.reduce(
          (acc, item) => acc + parseInt(item.amount),
          0
        );
        const totalDebit = result
          .filter((item) => item.accountType === "Debit")
          .reduce((acc, item) => acc + parseInt(item.amount), 0);
        const totalCredit = result
          .filter((item) => item.accountType === "Credit")
          .reduce((acc, item) => acc + parseInt(item.amount), 0);

        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
          month: new Date(2025, i, 1).toLocaleString("default", {
            month: "long",
          }),
          debit: 0,
          credit: 0,
        }));

        result.forEach((item) => {
          const date = new Date(item.date);
          if (!isNaN(date.getTime())) {
            const monthIndex = date.getMonth();
            if (item.accountType === "Debit") {
              monthlyData[monthIndex].debit += parseInt(item.amount);
            } else if (item.accountType === "Credit") {
              monthlyData[monthIndex].credit += parseInt(item.amount);
            }
          }
        });

        res.send({
          totalAmount,
          totalDebit,
          totalCredit,
          monthlyData,
        });
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Internal Server Error" });
      }
    });

    // // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Daily Expenses Server Turned On");
});

app.listen(port, () => {
  console.log(`Daily is Online on Port: ${port}`);
});
