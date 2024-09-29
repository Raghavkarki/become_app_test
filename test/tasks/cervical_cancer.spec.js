const { expect } = require('chai');
const Harness = require('cht-conf-test-harness');
const {
  cervicalCancer: {
    followup,
    screeningDateCorrect,
    taskTrigger
  },
  today
} = require('../form-inputs');
const harness = new Harness();

const CERVICAL_CANCER_FORM = 'cervical_cancer_screening';
const CERVICAL_CANCER_TASK = 'task.cervicel_cancer.referral_followup';

describe('Cervical cancer task generation test', () => {
  before(async () => await harness.start());
  after(async () => await harness.stop());

  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(today);
  });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('Checking followup task generation on expected condition and resolution', async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...taskTrigger);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 45 });
    const tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);
  });

  it('Checking task start date', async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...taskTrigger);
    expect(result.errors).to.be.empty;

    // Task does not appear before 30 days
    await harness.flush({ days: 29 });
    let tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(0);

    // Task appears on start date
    await harness.flush({ days: 1 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);
  });

  it('Checking task end date', async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...taskTrigger);
    expect(result.errors).to.be.empty;

    // Task appears till 60 days
    await harness.flush({ days: 60 });
    let tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);

    // Task disappears after 60 days
    await harness.flush({ days: 1 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(0);
  });

  it('No followup task generated if test done', async () => {
    const result = await harness.fillForm(CERVICAL_CANCER_FORM, ...screeningDateCorrect);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 45 });
    const tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(0);
  });

  it('Checking resolution after successful followup', async () => {
    let result = await harness.fillForm(CERVICAL_CANCER_FORM, ...taskTrigger);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 45 });
    let tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);

    // Resolving task on followup
    result = await harness.loadAction(tasks[0], ...followup());
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 105 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(0);
  });

  it('Checking followup after unsuccessful followup', async () => {
    let result = await harness.fillForm(CERVICAL_CANCER_FORM, ...taskTrigger);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 45 });
    let tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);

    // Generating second followup
    result = await harness.loadAction(tasks[0], ...followup(true));
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 105 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);
  });

  it('Checking another followup not generated after one followup on cervical cancer', async () => {
    let result = await harness.fillForm(CERVICAL_CANCER_FORM, ...taskTrigger);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 45 });
    let tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);

    // Generating second followup
    result = await harness.loadAction(tasks[0], ...followup(true));
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 105 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);

    // Testing last followup is not generated even 
    result = await harness.loadAction(tasks[0], ...followup(true));
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 105 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(0);
  });

  it('Checking previous followups do not affect current screening followups', async () => {
    let result = await harness.fillForm(CERVICAL_CANCER_FORM, ...taskTrigger);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 45 });
    let tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);

    // Generating second followup
    result = await harness.loadAction(tasks[0], ...followup(true));
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 105 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);

    // Testing last followup is not generated even 
    result = await harness.loadAction(tasks[0], ...followup(true));
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 105 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(0);

    // Moving 5 years into the future
    await harness.flush({ days: 1825 });
    result = await harness.fillForm(CERVICAL_CANCER_FORM, ...taskTrigger);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 45 });
    tasks = await harness.getTasks({ title: CERVICAL_CANCER_TASK });
    expect(tasks.length).to.equal(1);
  });
});
