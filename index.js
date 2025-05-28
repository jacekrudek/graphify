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
      "./tests/tech_texts/a1_autobahn.txt",
      "utf-8"
    );

    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `You are an information extraction assistant.
          From the technical text below, extract a structured representation of cities and their direct connections via infrastructure lines (e.g., railways, pipelines, electric lines, etc.). Output the result in JSON format as a list of objects, where each object contains a "city" field and a "connections" array isting all directly connected cities. Only list the immediate connections for every city, skip all the connections guiding through additional cities.
          Format Example:
          [
            {
              "city": "example",
              "connections": ["city2", "city3"]
            },
            {
              "city": "example2",
              "connections": ["city4", "city5"]
            }
          ]

          * Only include cities explicitly mentioned in the text.
          * Treat connections as **bidirectional**, unless clearly stated otherwise.
          * Do not list self-connections.
          * Normalize city names (e.g., remove abbreviations or extra formatting).
          Technical text: ${fileContent}`,
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

main();
