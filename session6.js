import { MongoClient } from "mongodb";

const url = "mongodb+srv://abdelrahmansapryalwtany_db_user:mrYQlXHFyFdWf58T@mongorevesion.js8oqkx.mongodb.net/?appName=mongoRevesion";

const client = new MongoClient(url);

const main = async () => {
    await client.connect();
    console.log("Connected successfully to server");

    const db = client.db('cqc');
    const collection = db.collection('courses');

    await collection.insertOne({
        title: "java",
        price: 2500
    })

    const data = await collection.find().toArray();

    console.log(data);
}

main();