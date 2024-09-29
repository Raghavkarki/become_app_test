const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { hypertension,hypertension_referral} = require('../form-inputs');
const harness = new TestRunner();
const HYPERTENSION_TASK_TITLE = 'task.hypertension_screening.referral_followup';
const HYPERTENSION_REFERRAL_TASK_TITLE = 'task.hypertension.referral_followup';

const HYPERTENSION_FORM= 'hypertension_screening';
const HYPERTENSION_REFERRAL_FORM= 'hypertension_referral';


describe('Hypertension screening and referral task tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });

  beforeEach(
    async () => {
      await harness.clear();
    });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });
  hypertension.triggers.forEach(({ sign, input }) => {
    it(`Checking task trigger for ${sign}`, async () => {
      const result = await harness.fillForm(HYPERTENSION_FORM, ...input);
      expect(result.errors).to.be.empty;

      await harness.flush({ days: 15 });

      const tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
      expect(tasks.length).to.equal(1);
    });
  });
  it(`ensure correct generation, maintenance, and expiration of hypertension screening and referral tasks based on specified time intervals`, async () => {
    const result = await harness.fillForm(HYPERTENSION_FORM, ...hypertension.bphypertension_risk_no);
    expect(result.errors).to.be.empty;

    const initialFlushDays = 15;
    const dueDateFlushDays = 30;
    const endDateFlushDays = 1;

    // Flush time by 15 days and verify task generation
    await harness.flush({ days: initialFlushDays });
    let tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
    expect(tasks.length).to.equal(1); // Task generated after 15 days (start date)

    // Flush time by an additional 30 days (total 45 days) and verify task is still present
    await harness.flush({ days: dueDateFlushDays });
    tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
    expect(tasks.length).to.equal(1); // Task still present at due date

    // Flush time by an additional 1 days (total 46 days) and verify task disappearance
    await harness.flush({ days: endDateFlushDays });
    tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
    expect(tasks.length).to.equal(0); // Task disappeared after end date
  });
  it(`ensure hypertension screening task is generated(nodangersigns and high bp condition) `, async () => {
    const result = await harness.fillForm(HYPERTENSION_FORM, ...hypertension.bphypertension_risk_no);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    const tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
    expect(tasks.length).to.equal(1);
  });
  it(`ensure hypertension screening task is generated(nodangersigns and if patients has high bp in present record) `, async () => {
    const result = await harness.fillForm(HYPERTENSION_FORM, ...hypertension.bphypertension_risk_past);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    const tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
    expect(tasks.length).to.equal(1);
  });
  it(`ensure hypertension screening task is not generated if (bp= normal) and no any dangersigns `, async () => {    
    const result = await harness.fillForm(HYPERTENSION_FORM, ...hypertension.bpnormal);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    const tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });
  it(`ensure Hypertension screening task is not trigger if no any danger signs`, async () => {
    const result = await harness.fillForm(HYPERTENSION_FORM, ...hypertension.noTriggers);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    const tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });
  it(`ensure Hypertension referral task is not triggered if the respone is yes `, async () => {
    const result = await harness.fillForm(HYPERTENSION_REFERRAL_FORM, ...hypertension_referral.resolved);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });
    
    const tasks = await harness.getTasks({ title: HYPERTENSION_REFERRAL_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });
  it(`ensure Hypertension referral task is triggered if the respone is no `, async () => {
    const result = await harness.fillForm(HYPERTENSION_REFERRAL_FORM, ...hypertension_referral.notresolved);
    expect(result.errors).to.be.empty;
    await harness.flush({ days: 15 });
    const tasks = await harness.getTasks({ title: HYPERTENSION_REFERRAL_TASK_TITLE });
    expect(tasks.length).to.equal(1);
  });
  it(`ensure the overall flow for Hypertension Use case`, async () => {
    let result = await harness.fillForm(HYPERTENSION_FORM, ...hypertension.bphypertension_risk_no);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 15 });

    let tasks = await harness.getTasks({ title: HYPERTENSION_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    result = await harness.loadAction(tasks[0], ...hypertension_referral.notresolved);
    await harness.flush({ days: 15 });
    expect(result.errors).to.be.empty;

    // Reload tasks after action
    tasks = await harness.getTasks({ title: HYPERTENSION_REFERRAL_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    result = await harness.loadAction(tasks[0], ...hypertension_referral.resolved);
    await harness.flush({ days: 15 });
    expect(result.errors).to.be.empty;

    // Ensure tasks are cleared after resolving
    tasks = await harness.getTasks({ title: HYPERTENSION_REFERRAL_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });


});
