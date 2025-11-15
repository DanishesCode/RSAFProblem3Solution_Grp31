const sql = require("mssql");
const { dbConfig } = require("../dbConfig");

async function createBacklogItem(data) {
    let connection;
    try {
      connection = await sql.connect(dbConfig);
  
      const query = `
        INSERT INTO Backlog (
          userId, 
          status, 
          title, 
          description, 
          priority, 
          requirements, 
          acceptCrit,
          agentId,
          repo,
          agentProcess
        )
        OUTPUT inserted.*
        VALUES (
          @userId,
          @status,
          @title,
          @description,
          @priority,
          @requirements,
          @acceptCrit,
          @agentId,
          @repo,
          @agentProcess
        );
      `;
  
      const request = connection.request();
  
      request.input("userId", data.userId);
      request.input("status", data.status);
      request.input("title", data.title);
      request.input("description", data.description);
      request.input("priority", data.priority);
      request.input("requirements", JSON.stringify(data.requirements || []));
      request.input("acceptCrit", JSON.stringify(data.acceptCrit || []));
      request.input("agentId", data.agentId);
      request.input("repo", data.repo);
      request.input("agentProcess", "[]");
  
      const result = await request.query(query);
  
      return result.recordset[0]; // return created backlog row
    } catch (error) {
      console.error("Database error:", error);
      throw error;
    } finally {
      if (connection) {
        try {
          await connection.close();
        } catch (closeError) {
          console.error("Error closing connection:", closeError);
        }
      }
    }
  }

async function updateBacklogItemStatus(taskId, status) {
    let connection;
    try {
        connection = await sql.connect(dbConfig);
        
        const query = `
            UPDATE Backlog
            SET status = @status
            WHERE taskId = @taskId;

            SELECT * FROM Backlog WHERE taskId = @taskId;
        `;
        
        const request = connection.request();
        
        request.input("status", status);
        // The taskId field in your database is an INT, so ensure the input is treated as such.
        request.input("taskId", sql.Int, parseInt(taskId)); 
        
        const result = await request.query(query);
        
        return result.recordset[0]; // Return the updated task row
    } catch (error) {
        console.error("Database error updating status:", error);
        throw error;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (closeError) {
                console.error("Error closing connection:", closeError);
            }
        }
    }
}
async function getBacklogsByUserId(userId) {
  let connection;
  try {
      connection = await sql.connect(dbConfig);

      const query = `
          SELECT b.*, a.agentName, a.agentSpecial
          FROM Backlog b
          JOIN AgentFilter a ON b.agentId = a.agentId
          WHERE b.userId = @userId;
      `;

      const request = connection.request();

      request.input("userId", sql.Int, parseInt(userId));

      const result = await request.query(query);

      return result.recordset;   // return all backlog rows
  } catch (error) {
      console.error("Database error retrieving backlogs:", error);
      throw error;
  } finally {
      if (connection) {
          try {
              await connection.close();
          } catch (closeError) {
              console.error("Error closing connection:", closeError);
          }
      }
  }
}


module.exports = {
    createBacklogItem,
    updateBacklogItemStatus,// Export the new function
    getBacklogsByUserId

};

    