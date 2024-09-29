const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { today, pregnancy, delivery, pregnancyHomeVisit } = require('../form-inputs');
const harness = new TestRunner();
const DELIVERY_TASK_TITLE = 'task.anc.delivery.confirmation.visit.title';
const PREGNANCY_HOME_VISIT_FORM = 'pregnancy_home_visit';

describe('delivery confirmation task tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });

  beforeEach(
    async () => {
      await harness.clear();
      await harness.setNow(today);
    });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it(`Ensure pregnancy generates delivery confirmation task on right time and dead delivery resolves it.`, async () => {
    let result = await harness.fillForm('pregnancy', ...pregnancy.eightMonthPregnant);
    expect(result.errors).to.be.empty;

    // Not available as of 238 days
    let tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
    expect(tasks.length).to.equal(0);

    // Available from 247 days, ensure task appears
    await harness.flush({ days: 12 });
    tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    // Submit delivery form and ensure task is resolved.
    result = await harness.loadAction(tasks[0], ...delivery.deadDelivery());
    expect(result.errors).to.be.empty;
    tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });

  it(`Ensure pregnancy generates delivery confirmation task and normal delivery resolves it.`, async () => {
    let result = await harness.fillForm('pregnancy', ...pregnancy.eightMonthPregnant);
    expect(result.errors).to.be.empty;

    // on 300th day
    await harness.flush({ days: 62 });
    let tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    // submit delivery form and ensure task is resolved. 
    result = await harness.loadAction(tasks[0], ...delivery.normalDelivery(today.plus({ days: 62 })));
    expect(result.errors).to.be.empty;
    tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });

  ['miscarriage', 'abortion'].forEach(interruption => {
    it(`Delivery confirmation task is not shown if pregnancy is ${interruption}.`, async () => {

      await harness.fillForm('pregnancy', ...pregnancy.eightMonthPregnant);

      // expect pregnance home visit task 
      let tasks = await harness.getTasks({ title: 'task.anc.pregnancy_home_visit.title' });
      expect(tasks.length).to.equal(1);

      // Report miscarriage and expect delivery confirmation task not to appear. 
      await harness.flush({ days: 1 });
      const result = await harness.loadAction(tasks[0], ...pregnancyHomeVisit.interrupted(interruption, today));
      expect(result.errors).to.be.empty;

      await harness.flush({ days: 30 });

      tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
      expect(tasks.length).to.equal(0);
    });
  });

  ['migrated', 'refused'].forEach(reason => {
    it(`Delivery confirmation task is not shown if woman ${reason} and cleared all.`, async () => {
      await harness.fillForm('pregnancy', ...pregnancy.eightMonthPregnant);
      // Report migrated or refused and clear all visits
      await harness.flush({ days: 1 });
      const result = await harness.fillForm(PREGNANCY_HOME_VISIT_FORM, ...pregnancyHomeVisit.noService(reason, 'clear_all'));
      expect(result.errors).to.be.empty;

      // Don't expect delivery confirmation task to appear.
      await harness.flush({ days: 30 });
      const tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
      expect(tasks.length).to.equal(0);
    });
  });

  ['migrated', 'refused'].forEach(reason => {
    it(`Delivery confirmation task is shown if woman ${reason} and cleared only current visit.`, async () => {
      await harness.fillForm('pregnancy', ...pregnancy.eightMonthPregnant);
      // Report migration or refused, but clear only current task
      await harness.flush({ days: 1 });
      const result = await harness.fillForm(PREGNANCY_HOME_VISIT_FORM, ...pregnancyHomeVisit.noService(reason, 'clear_this'));
      expect(result.errors).to.be.empty;

      // Still expect task to appear
      await harness.flush({ days: 30 });
      let tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
      expect(tasks.length).to.equal(1);

      // Now resolve it
      await harness.loadAction(tasks[0], ...delivery.deadDelivery());
      tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
      expect(tasks.length).to.equal(0);
    });
  });

  // Ensure that delivery confirmation task is resolved if delivery form is submitted soon after LMP
  // medic/config-nssd#536
  it(`Ensure delivery confirmation task is resolved if delivery form is submitted soon after LMP`, async () => {
    let result = await harness.fillForm('pregnancy', ...pregnancy.newlyPregnant); // 84 days ago
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 99 }); // 184 days (~ 6 months) since LMP

    result = await harness.fillForm('delivery', ...delivery.normalDelivery(today.plus({ days: 99 })));
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 64 }); // 248 days since LMP
    const tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
    expect(tasks.length).to.equal(0);

    const summary = await harness.countTaskDocsByState({ title: DELIVERY_TASK_TITLE });
    expect(summary).to.nested.include({
      Completed: 1, // resolved delivery confirmation task
      Ready: 0,
      Total: 1
    }, JSON.stringify(summary));
  });

  it(`Ensure delivery confirmation task appears for a new pregnancy`, async () => {
    let result = await harness.fillForm('pregnancy', ...pregnancy.eightMonthPregnant); //238 days ago, 2022-04-27
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 12 }); // 250 days since LMP

    result = await harness.fillForm('delivery', ...delivery.normalDelivery(today.minus({ days: 40 })));//2022-11-11
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 30 }); // 280 days since LMP, 2023-02-01

    result = await harness.fillForm('pregnancy', ...pregnancy.givenLMP(today.minus({ days: 30 })));//2022-11-21
    expect(result.errors).to.be.empty;

    
    await harness.flush({ days: 175 }); // 2023-07-26
    const tasks = await harness.getTasks({ title: DELIVERY_TASK_TITLE });
    expect(tasks.length).to.equal(1);
  });

});
