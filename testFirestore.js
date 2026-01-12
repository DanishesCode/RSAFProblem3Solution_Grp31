const { db } = require("./firebaseAdmin");

async function run() {
  const snap = await db.collection("agent").get();
  console.log("agent docs:");
  snap.forEach((doc) => console.log(doc.id, doc.data()));
}

run().catch(console.error);
