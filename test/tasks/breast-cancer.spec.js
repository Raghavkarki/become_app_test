const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const harness = new TestRunner();
const BREAST_CANCER_FORM = 'breast_cancer';
const BREAST_CANCER_FOLLOWUP = 'breast_cancer_followup';
const BREAST_CANCER_SCREENING_FOLLOWUP = 'task.breast_cancer_screening.diagnosis_followup.title';
const BREAST_CANCER_FOLLOWUPS_FOLLOWUP = 'task.breast_cancer_followup.hfOrHospitalCheckup_followup.title';

const {
  today,
  breastCancer: {
    BC_followup_input,
    BC_followup_followup,
    BC_Followup_No_Cancer,
    BC_Normal_Condition,
    BC_Date_5_Yrs_Plus,
    BC_tomorrow_date
  }
} = require('../form-inputs');

describe('Breast cancer form and task tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });

  beforeEach(
    async () => {
      await harness.clear();
      await harness.setNow(today);
    }
  );

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it(`Ensure that breast cancer symptom identification generates followup confirmation task and filling followup with hf visit resolves it`, async () => {
    let result = await harness.fillForm(BREAST_CANCER_FORM, ...BC_followup_input);
    expect(result.errors).to.be.empty;

    // Available from 30 days, ensure task appears
    await harness.flush({ days: 30 });
    let tasks = await harness.getTasks({ title: BREAST_CANCER_SCREENING_FOLLOWUP });
    expect(tasks.length).to.equal(1);

    //Submit follwoup form and ensure task is resolved.
    result = await harness.loadAction(tasks[0], ...BC_Followup_No_Cancer);
    expect(result.errors).to.be.empty;
    tasks = await harness.getTasks({ title: BREAST_CANCER_SCREENING_FOLLOWUP });
    expect(tasks.length).to.equal(0);
  });

  it(`Ensure that breast cancer followup form does not generate when BSE test result is normal`, async () => {
    const result = await harness.fillForm(BREAST_CANCER_FORM, ...BC_Normal_Condition);
    expect(result.errors).to.be.empty;

    // Available from 30 days, ensure task does not appear
    await harness.flush({ days: 30 });
    const tasks = await harness.getTasks({ title: BREAST_CANCER_SCREENING_FOLLOWUP });
    expect(tasks.length).to.equal(0);
  });

  it(`Ensure that breast cancer form throws error when check date is more than birthdate`, async () => {
    const result = await harness.fillForm(BREAST_CANCER_FORM, ...BC_Date_5_Yrs_Plus);
    expect(result.errors).to.not.be.empty;
    expect(result.errors[0].msg).to.equal("Day/Month/Year. Put 1 in day if you don't know the exact day.");
  });

  it(`Ensure that breast cancer form throws error when check date is after today`, async () => {
    const result = await harness.fillForm(BREAST_CANCER_FORM, ...BC_tomorrow_date);
    expect(result.errors).to.not.be.empty;
    expect(result.errors[0].msg).to.equal("Day/Month/Year. Put 1 in day if you don't know the exact day.");
  });

  //First element of the array is the number of days since from is filled, the 0,1 of the second elemnt is the number of task that should be visible on that day.
  [[29, 0], [30, 1], [45, 1], [61, 0]].forEach(dayAndTaskAvailability => {
    it(`Breast cancer followup task in case of BSE diagnosis for day ${dayAndTaskAvailability[0]} should be ${dayAndTaskAvailability[1]}`, async () => {
      const result = await harness.fillForm(BREAST_CANCER_FORM, ...BC_followup_input);
      expect(result.errors).to.be.empty;

      let tasks = await harness.getTasks({ title: BREAST_CANCER_SCREENING_FOLLOWUP });
      expect(tasks.length).to.equal(0);

      await harness.flush({ days: dayAndTaskAvailability[0] });
      tasks = await harness.getTasks({ title: BREAST_CANCER_SCREENING_FOLLOWUP });
      expect(tasks.length).to.equal(dayAndTaskAvailability[1]);
    });
  });

  //First element of the array is the number of days since from is filled, the 0,1 of the second elemnt is the number of task that should be visible on that day.
  [[89, 0], [90, 1], [105, 1], [121, 0]].forEach(dayAndTaskAvailability => {
    it(`Breast cancer followup's followup task if Hf not visited for day ${dayAndTaskAvailability[0]} should be ${dayAndTaskAvailability[1]}`, async () => {
      const result = await harness.fillForm(BREAST_CANCER_FOLLOWUP, ...BC_followup_followup);
      expect(result.errors).to.be.empty;

      let tasks = await harness.getTasks({ title: BREAST_CANCER_FOLLOWUPS_FOLLOWUP });
      expect(tasks.length).to.equal(0);

      await harness.flush({ days: dayAndTaskAvailability[0] });
      tasks = await harness.getTasks({ title: BREAST_CANCER_FOLLOWUPS_FOLLOWUP });
      expect(tasks.length).to.equal(dayAndTaskAvailability[1]);
    });
  });

  it(`Ensure that followup's followup resolves after form fillup`, async () => {
    let result = await harness.fillForm(BREAST_CANCER_FOLLOWUP, ...BC_followup_followup);
    expect(result.errors).to.be.empty;

    // Available from 90 days, ensure task appears
    await harness.flush({ days: 90 });
    let tasks = await harness.getTasks({ title: BREAST_CANCER_FOLLOWUPS_FOLLOWUP });
    expect(tasks.length).to.equal(1);

    // Submit followup form and ensure task is resolved.
    result = await harness.loadAction(tasks[0], ...BC_Followup_No_Cancer);
    expect(result.errors).to.be.empty;
    tasks = await harness.getTasks({ title: BREAST_CANCER_FOLLOWUPS_FOLLOWUP });
    expect(tasks.length).to.equal(0);
  });
});

