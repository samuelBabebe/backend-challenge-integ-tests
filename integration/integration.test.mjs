import mongoose from "mongoose";
import patientmodel from "backend-challenge/database/patientmodel.mjs";
import emailModel from "backend-challenge/database/emailModel.mjs";
import readCsv from "backend-challenge/readCsv.mjs";
import readWrite from "backend-challenge/readWrite.mjs";
import connectToMongoose, {closeConnection} from "backend-challenge/util.mjs";

describe("integration tests", () => {
  const path = process.env.npm_package_config_path;
  let patientsFromCsv = null;
  let emailsFromDb = null

  beforeAll(async () => {
    await connectToMongoose();
    await readWrite(path);
    patientsFromCsv = await readCsv(path);
    emailsFromDb = await emailModel.find({})
  });

  afterAll(() => {
    closeConnection();
  });
  it("Verify the data in flat file matches the data in Patients collection", async () => {
    let patientsFromDb = await patientmodel.find({});
  
    //remove values set by mongoose
    patientsFromDb = patientsFromDb.map((patient) => {
      return {
        ...patient.toObject(),
        _id: undefined,
        __v: undefined,
      };
    });
    let comparator = (a, b) => a["Member ID"] - b["Member ID"];
    expect(patientsFromDb.sort(comparator)).toEqual(
      patientsFromCsv.sort(comparator)
    );
  });

  it("Verify Emails were created in Emails Collection for patients who have CONSENT as Y", async() =>{
      let emailPatients = patientsFromCsv.filter((patient)=>patient.CONSENT === "Y");
      emailPatients.forEach(patient => {
        expect(emailsFromDb.filter((email)=>email["Member ID"] == patient["Member ID"])).toHaveLength(4);
      })
  })
  
  it("Verify emails for each patient are scheduled correctly", async() => {
    let emailPatients = patientsFromCsv.filter((patient)=>patient.CONSENT === "Y");
    let expectedDates = [1,2,3,4].map(value => {
      let date = new Date();
      date.setDate(date.getDate() + value);
      return date.toLocaleDateString("en-US");
    }).sort();
    emailPatients.forEach(patient => {
      expect(emailsFromDb.filter((email)=>email["Member ID"] == patient["Member ID"])
      .map(email => email["Scheduled Date"])
      .sort()).toEqual(expectedDates)
    })
  })

  //printings
  it("printing all patient IDs where email is missing", async () => {
    let patientsFromDb = await patientmodel.find({});
    console.log(patientsFromDb.filter(patient => !patient["First Name"]));
  })

  it("Print out all Patient IDs where the email address is missing, but consent is Y", async() => {
    let patientsFromDb = await patientmodel.find({});
    console.log(patientsFromDb.filter(patient => !patient["Email Address"] && patient["CONSENT"]=='Y'));
  })
});
