import Groq from "groq-sdk";
import "dotenv/config";
import { readFile } from "fs/promises";
import Neo4jConnection from "./src/db/neo4j.js";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  try {
    console.log("CWD:", process.cwd());

    const fileContent = await readFile(
      "./tests/tech_texts/express_road_1.txt",
      "utf-8"
    );

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `return the most important data from the below tech-text in a JSON format. the text: ${fileContent}`,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0,
    });

    console.log(response.choices[0].message.content);
  } catch (error) {
    console.error(error);
  }
}

class UserService {
  constructor() {
    this.db = new Neo4jConnection();
  }

  // Create a user
  async createUser(name, email) {
    const session = this.db.getSession();
    try {
      const result = await session.run(
        "CREATE (u:User {name: $name, email: $email}) RETURN u",
        { name, email }
      );
      const user = result.records[0].get("u").properties;
      console.log("Created user:", user);
      return user;
    } finally {
      await session.close();
    }
  }

  // Find users
  async findUsers() {
    const session = this.db.getSession();
    try {
      const result = await session.run("MATCH (u:User) RETURN u");
      const users = result.records.map((record) => record.get("u").properties);
      console.log("Found users:", users);
      return users;
    } finally {
      await session.close();
    }
  }

  // Create relationship
  async createFriendship(user1Email, user2Email) {
    const session = this.db.getSession();
    try {
      const result = await session.run(
        `
        MATCH (u1:User {email: $email1})
        MATCH (u2:User {email: $email2})
        CREATE (u1)-[r:FRIENDS_WITH]->(u2)
        RETURN u1, u2, r
      `,
        { email1: user1Email, email2: user2Email }
      );

      console.log("Created friendship between users");
      return result.records[0];
    } finally {
      await session.close();
    }
  }

  // Find friends
  async findFriends(userEmail) {
    const session = this.db.getSession();
    try {
      const result = await session.run(
        `
        MATCH (u:User {email: $email})-[:FRIENDS_WITH]->(friend:User)
        RETURN friend
      `,
        { email: userEmail }
      );

      const friends = result.records.map(
        (record) => record.get("friend").properties
      );
      console.log(`Friends of ${userEmail}:`, friends);
      return friends;
    } finally {
      await session.close();
    }
  }

  // Close connection
  async close() {
    await this.db.close();
  }
}

// Example usage
async function main2() {
  const db = new Neo4jConnection();

  try {
    let session = db.getSession();
    const result = await session.run("MATCH (u:User) RETURN u");
    const users = result.records.map((record) => record.get("u").properties);
    console.log("Found users:", users);
    await session.close();
  } catch (error) {
    console.error(error);
  } finally {
    await db.close();
  }
}

main2();
