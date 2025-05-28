import neo4j from "neo4j-driver";

class Neo4jConnection {
  constructor() {
    // Configuration
    this.uri = process.env.NEO4J_URI;
    this.username = process.env.NEO4J_USERNAME;
    this.password = process.env.NEO4J_PASSWORD;

    // Create driver instance
    this.driver = neo4j.driver(
      this.uri,
      neo4j.auth.basic(this.username, this.password)
    );
  }

  // Get a session
  getSession() {
    return this.driver.session();
  }

  // Close the driver
  async close() {
    await this.driver.close();
  }

  // Test connection
  async testConnection() {
    const session = this.getSession();
    try {
      const result = await session.run(
        'RETURN "Connection successful" AS message'
      );
      console.log("Neo4j connection test:", result.records[0].get("message"));
      return true;
    } catch (error) {
      console.error("Neo4j connection failed:", error);
      return false;
    } finally {
      await session.close();
    }
  }
}

export default Neo4jConnection;
