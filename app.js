const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const dbPath = path.join(__dirname, "covid19IndiaPortal.db");
const app = express();
app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const authenticateToken = (request, response, next) => {
  const authHeader = request.headers["authorization"];
  let jwtToken;
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
    if (jwtToken === undefined) {
      response.status(401);
      response.send("Invalid JWT Token");
    } else {
      jwt.verify(jwtToken, "SECRET_CODE", async (error, user) => {
        if (error) {
          response.status(401);
          response.send("Invalid JWT Token");
        } else {
          next();
        }
      });
    }
  }
};

//AP1
app.post("/login/", authenticateToken, async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username='${username}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "SECRET_CODE");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API
app.get("/login/", authenticateToken, (request, response) => {
  console.log("Inside Get API");
});

//API2
app.get("/states/", authenticateToken, async (request, response) => {
  const getUserQuery = `SELECT state_id AS stateId,state_name AS stateName,population FROM state;`;
  const dbUser = await db.all(getUserQuery);
  response.send(dbUser);
});

//API3
app.get("/states/:stateId/", authenticateToken, async (request, response) => {
  const { stateId } = request.params;
  const getUserQuery = `SELECT state_id AS stateId,state_name AS stateName,population FROM state WHERE stateId=${stateId};`;
  const dbUser = await db.get(getUserQuery);
  response.send(dbUser);
});

//API4
app.post("/districts/", authenticateToken, async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const addUserQuery = `INSERT INTO district(district_name,state_id,cases,cured,active,deaths) VALUES('${districtName}',${stateId},${cases},${cured},${active},${deaths});`;
  await db.run(addUserQuery);
  response.send("District Successfully Added");
});

//API5
app.get(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const getUserQuery = `SELECT district_id AS districtId,district_name AS districtName,state_id AS stateId,cases,cured,active,deaths FROM district WHERE districtId =${districtId};`;
    const dbUser = await db.get(getUserQuery);
    response.send(dbUser);
  }
);

//API6
app.delete(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const deleteUserQuery = `DELETE FROM district WHERE district_id=${districtId};`;
    await db.run(deleteUserQuery);
    response.send("District Removed");
  }
);

//API7
app.put(
  "/districts/:districtId/",
  authenticateToken,
  async (request, response) => {
    const { districtId } = request.params;
    const {
      districtName,
      stateId,
      cases,
      cured,
      active,
      deaths,
    } = request.body;
    const updateUserQuery = `UPDATE district SET district_name='${districtName}',state_id=${stateId},cases=${cases},cured=${cured},active=${active},deaths=${deaths} WHERE district_id=${districtId};`;
    await db.run(updateUserQuery);
    response.send("District Details Updated");
  }
);

//API8
app.get(
  "/states/:stateId/stats/",
  authenticateToken,
  async (request, response) => {
    const { stateId } = request.params;
    const getUserQuery = `SELECT SUM(cases) AS totalCases,SUM(cured) AS totalCured,SUM(active) AS totalActive,SUM(deaths) AS totalDeaths FROM state NATURAL JOIN district WHERE state_id=${stateId};
    `;
    const dbUser = await db.all(getUserQuery);
    response.send(dbUser);
  }
);

module.exports = app;
