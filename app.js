const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "covid19India.db");

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
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbObjectIntoResponseObject = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

const convertDistrictObjectIntoResponseObject = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

app.get("/states/", async (request, response) => {
  const getAllStatesQuery = `
  SELECT
    *
  FROM
    state;`;
  const statesArray = await db.all(getAllStatesQuery);
  response.send(
    statesArray.map((eachState) => {
      return convertDbObjectIntoResponseObject(eachState);
    })
  );
});

app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const getStateQuery = `
    SELECT
      *
    FROM 
      state
    WHERE 
      state_id=${stateId};`;
  const state = await db.get(getStateQuery);
  response.send(convertDbObjectIntoResponseObject(state));
});

app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictQuery = `
    SELECT
      *
    FROM 
      district
    WHERE 
      district_id=${districtId};`;
  const district = await db.get(getDistrictQuery);
  response.send(convertDistrictObjectIntoResponseObject(district));
});

app.post("/districts/", async (request, response) => {
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  console.log(districtName, stateId, cases, cured, active, deaths);
  const postDistrictQuery = `
    INSERT INTO
      district (district_name,state_id,cases,cured,active,deaths)
    VALUES
      (
          '${districtName}',
          ${stateId},
          ${cases},
          ${cured},
          ${active},
          ${deaths}
      );`;
  const dbResponse = await db.run(postDistrictQuery);
  response.send("District Successfully Added");
});

app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const deleteQuery = `
    DELETE FROM 
      district
    WHERE district_id=${districtId};`;
  await db.run(deleteQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const putDistrictQuery = `
    UPDATE 
      district
    SET 
      district_name='${districtName}',
      state_id=${stateId},
      cases=${cases},
      cured=${cured},
      active=${active},
      deaths=${deaths}
    WHERE district_id=${districtId};`;
  await db.run(putDistrictQuery);
  response.send("District Details Updated");
});

const convertStatsResponseObject = (dbResponse) => {
  return {
    totalCases: dbResponse.cases,
    totalCured: dbResponse.cured,
    totalActive: dbResponse.active,
    totalDeaths: dbResponse.deaths,
  };
};

app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const getStatsQuery = `
  SELECT
    *
  FROM
    district
  WHERE
  state_id=${stateId};`;
  const dbResponse = await db.get(getStatsQuery);
  console.log(dbResponse);
  response.send(convertStatsResponseObject(dbResponse));
});

const convertAndGetDistrictName = (dbResponse) => {
  return {
    stateName: dbResponse.state_name,
  };
};

app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictNameQuery = `
    SELECT
      *
    FROM 
      district
      INNER JOIN state
      ON district.state_id=state.state_id
    WHERE 
      district.district_id=${districtId};`;
  const dbResponse = await db.get(getDistrictNameQuery);
  console.log(dbResponse);
  response.send(convertAndGetDistrictName(dbResponse));
});

module.exports = app;
