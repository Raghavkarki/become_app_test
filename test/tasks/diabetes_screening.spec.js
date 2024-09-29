const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { diabetes, diabetes_referral } = require('../form-inputs');

const harness = new TestRunner();
const DIABETES_TASK_TITLE = 'task.diabetes_screening.referral_followup';
const DIABETES_REFERRAL_TASK_TITLE = 'task.diabetes.referral_followup';

const DIABETES_FORM = 'diabetes_screening';
const DIABETES_REFERRAL_FORM = 'diabetes_referral';

describe('Diabetes screening and referral task tests', () => {
  before(async () => await harness.start());
  after(async () => await harness.stop());

  beforeEach(async () => {
    await harness.clear();
  });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });
  diabetes.triggers.forEach(({ sign, input }) => {
    it(`Checking task trigger for ${sign}`, async () => {
      const result = await harness.fillForm(DIABETES_FORM, ...input);
      expect(result.errors).to.be.empty;

      await harness.flush({ days: 15 });

      const tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
      expect(tasks.length).to.equal(1);
    });
  });

  it(`ensure correct generation, maintenance, and expiration of diabetes screening and referral tasks based on specified time intervals`, async () => {
    const result = await harness.fillForm(DIABETES_FORM, ...diabetes.highFBS, ...diabetes.diabetes_before_medsno);
    expect(result.errors).to.be.empty;

    const initialFlushDays = 15;
    const dueDateFlushDays = 30;
    const endDateFlushDays = 1;

    // Flush time by 15 days and verify task generation
    await harness.flush({ days: initialFlushDays });
    let tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(1); // Task generated after 15 days (start date)

    // Flush time by an additional 30 days (total 45 days) and verify task is still present
    await harness.flush({ days: dueDateFlushDays });
    tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(1); // Task still present at due date

    // Flush time by an additional 1 days (total 46 days) and verify task disappearance
    await harness.flush({ days: endDateFlushDays });
    tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(0); // Task disappeared after end date
  });

  it(`ensure diabetes screening task is not generated if (FBS diabetes is normal) and no any danger signs`, async () => {
    // if the patients have no record of diabetes
    const result = await harness.fillForm(DIABETES_FORM, ...diabetes.normalFBS, ...diabetes.diabetes_after);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    // if patients diabetes is normal and has no any danger signs, task isn't created
    const tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });
  it(`ensure diabetes screening task is generated if fbs lv is high/no dagner signs `, async () => {
    const result = await harness.fillForm(DIABETES_FORM, ...diabetes.highFBS, ...diabetes.diabetes_before_medsno);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    const tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(1);
  });
  it(`ensure diabetes screening task is generated if PPS or RBS lv is high/no dagner signs `, async () => {

    const result = await harness.fillForm(DIABETES_FORM, ...diabetes.highPPS, ...diabetes.diabetes_before_medsyes);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    // if the patients have diabetes but isnt taking any medications thenn task is created
    const tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(1);
  });
  it(`ensure diabetes screening task is generated if (PPS OR RBS diabetes is normal but used to have) and no dangersigns `, async () => {

    const result = await harness.fillForm(DIABETES_FORM, ...diabetes.normalPPS, ...diabetes.diabetes_before_medsno);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    const tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(1);
  });


  it(`ensure diabetes screening task is not generated if (PPS OR RBS diabetes is normal) and no any dangersigns `, async () => {
    //if the patients have no record of diabetes

    const result = await harness.fillForm(DIABETES_FORM, ...diabetes.normalPPS, ...diabetes.diabetes_after);
    expect(result.errors).to.be.empty;
    //if patients diabetes is normal and has no any danger signs task isnt created
    const tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });
  it(`ensure Diabetes screening task is not trigger if no any danger signs`, async () => {
    const result = await harness.fillForm(DIABETES_FORM, ...diabetes.noTriggers);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    const tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });
  it(`ensure Diabetes referral task is not triggered if the respone is yes `, async () => {
    const result = await harness.fillForm(DIABETES_REFERRAL_FORM, ...diabetes_referral.resolved);
    expect(result.errors).to.be.empty;
    await harness.flush({ days: 15 });
    const tasks = await harness.getTasks({ title: DIABETES_REFERRAL_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });
  it(`ensure Diabetes referral task is triggered if the respone is no `, async () => {
    const result = await harness.fillForm(DIABETES_REFERRAL_FORM, ...diabetes_referral.notresolved);
    expect(result.errors).to.be.empty;
    await harness.flush({ days: 15 });
    const tasks = await harness.getTasks({ title: DIABETES_REFERRAL_TASK_TITLE });
    expect(tasks.length).to.equal(1);
  });
  it(`ensure the overall flow for Diabetes Use case`, async () => {
    let result = await harness.fillForm(DIABETES_FORM, ...diabetes.normalPPS, ...diabetes.diabetes_before_medsno);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    let tasks = await harness.getTasks({ title: DIABETES_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    result = await harness.loadAction(tasks[0], ...diabetes_referral.notresolved);
    await harness.flush({ days: 15 });
    expect(result.errors).to.be.empty;

    // Reload tasks after action
    tasks = await harness.getTasks({ title: DIABETES_REFERRAL_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    result = await harness.loadAction(tasks[0], ...diabetes_referral.resolved);
    await harness.flush({ days: 15 });
    expect(result.errors).to.be.empty;

    // Ensure tasks are cleared after resolving
    tasks = await harness.getTasks({ title: DIABETES_REFERRAL_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });

});
