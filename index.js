import Groq from "groq-sdk";
import "dotenv/config";
import { readFile } from "fs/promises";
import Neo4jConnection from "./src/db/neo4j.js";
import neo4j from "neo4j-driver";

const driver = neo4j.driver(
  process.env.NEO4J_URI,
  neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
);

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

function transformForGraphDB(data) {
  let jsonData;
  if (typeof data === "string") {
    try {
      jsonData = JSON.parse(data);
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return null;
    }
  } else {
    jsonData = data;
  }

  const cityMap = new Map();

  jsonData.forEach((item) => {
    const city = item.city;
    const connections = new Map(Object.entries(item.connections || {}));
    cityMap.set(city, { connections });
  });

  return cityMap;
}

async function insertGraphData(cityMap) {
  const session = driver.session();
  try {
    for (const [city, { connections }] of cityMap.entries()) {
      await session.run(
        `MERGE (c:City {name: $city})`,
        { city }
      );

      for (const [target, distance] of connections.entries()) {
        await session.run(
          `
          MERGE (c1:City {name: $city})
          MERGE (c2:City {name: $target})
          MERGE (c1)-[r:CONNECTED_TO {distance: $distance}]->(c2)
          MERGE (c2)-[r2:CONNECTED_TO {distance: $distance}]->(c1)
          `,
          { city, target, distance: Number(distance) }
        );
      }
    }
    console.log("Success");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await session.close();
  }
}


function extractJsonArray(str) {
  const start = str.indexOf("[");
  const end = str.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) {
    throw new Error("No valid JSON array found in the string.");
  }
  const jsonString = str.slice(start, end + 1);
  return JSON.parse(jsonString);
}

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
          From the technical text below, extract a structured representation of cities and their direct connections via infrastructure lines (e.g., railways, pipelines, electric lines, etc.). Output the result in JSON format as a list of objects, where each object contains a "city" field and a "connections" array listing all directly connected and the distance to them. Only list the immediate connections for every city, skip all the connections guiding through additional cities.
          Format Example:
          [
            {
              "city": "example",
              "connections": {
                "city2": 20,
                "city3": 30
              }
            },
            {
              "city": "example2",
              "connections": {
                "city2": 20,
                "city3": 30
              }
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

    const rawContent = response.choices[0].message.content;
    let jsonData;
    try {
      jsonData = extractJsonArray(rawContent);
    } catch (e) {
      console.error("Failed to extract JSON array:", e);
      jsonData = null;
    }

    const cityMap = jsonData ? transformForGraphDB(jsonData) : null;
    if (cityMap) {
  for (const [city, { connections }] of cityMap.entries()) {
    console.log(`City: ${city}`);
    for (const [target, distance] of connections.entries()) {
      console.log(`  connects to ${target} (${distance} km)`);
    }
  }

  await insertGraphData(cityMap);
}
  } catch (error) {
    console.error(error);
  }

  await driver.close();
}

main();
