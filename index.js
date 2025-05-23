import Groq from "groq-sdk";
import "dotenv/config";

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  try {
    const response = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: `tell me really funny a joke`,
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

main();
