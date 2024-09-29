const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { delivery, pncSchedule, pncService, today, pnc_service1, pnc_referral_form } = require('../form-inputs');
const harness = new TestRunner();
const PNC_SERVICE_TASK_TITLE = 'task.pnc_service_after_delivery';
const PNC_FOLLOWUP_TASK_TITLE = 'task.pnc_service_referral_followup';
const PNC_REFERRAL_FOLLOWUP_TASK_TITLE = 'task.pnc_referral_followup';
const delivery_form = 'delivery';
const pnc_service_form = 'pnc_service_form';
const pnc_referral_followup = 'pnc_referral_followup_form';
const updatedDeliveryDate = [
  { days: 1, flushDays: 2 },
  { days: 4, flushDays: 10 },
  { days: 15, flushDays: 27 }
];

describe('PNC Service task tests ', () => {
  before(async () => {
    return await harness.start();
  });

  after(async () => {
    return await harness.stop();
  });

  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(today);
  });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });
  pncSchedule.forEach((dueDay) => {
    const days = dueDay;

    it(`Ensuring PNC Visit tasks displays in ${dueDay} days`, async () => {
      let result = await harness.fillForm(
        delivery_form,
        ...delivery.normalDeliveryCS()
      );
      expect(result.errors).to.be.empty;

      // Testing the PNC task appears as designed
      await harness.flush({ days });
      let tasks = await harness.getTasks({ title: PNC_SERVICE_TASK_TITLE });
      expect(tasks.length).to.equal(1);

      // Testing PNC task resolution
      result = await harness.loadAction(tasks[0], ...pnc_service1.no);
      expect(result.errors).to.be.empty;

      tasks = await harness.getTasks({ title: PNC_FOLLOWUP_TASK_TITLE });
      expect(tasks.length).to.equal(0);
    });
  });

  updatedDeliveryDate.forEach(({ days, flushDays }) => {
    it(`Ensuring PNC Visit tasks displays in ${days} days (updating DeliveryDate for every cases )`, async () => {
      const dateOfDelivery = today.minus({ days });
      const result = await harness.fillForm(delivery_form, ...delivery.normalDelivery(dateOfDelivery));
      expect(result.errors).to.be.empty;

      await harness.flush({ days: flushDays });
      const tasks = await harness.getTasks({ title: PNC_SERVICE_TASK_TITLE });
      expect(tasks.length).to.equal(1);
    });
  });

  pncService.triggers.forEach(({ sign, input }) => {
    it(`Checking PNC service task trigger for ${sign}`, async () => {
      let result = await harness.fillForm(
        delivery_form,
        ...delivery.normalDeliveryCS()
      );
      expect(result.errors).to.be.empty;
      await harness.flush({ days: 2 });

      const tasks = await harness.getTasks({ title: PNC_SERVICE_TASK_TITLE });
      expect(tasks.length).to.equal(1);

      result = await harness.loadAction(tasks[0], pnc_service_form, ...input);
      expect(result.errors).to.be.empty;
    });
  });

  it(`Checking PNC service task is not triggered for if no any dangersigns is present`, async () => {
    const result = await harness.fillForm(pnc_service_form, ...pncService.noTriggers);
    expect(result.errors).to.be.empty;

    const tasks = await harness.getTasks({ title: PNC_FOLLOWUP_TASK_TITLE });
    expect(tasks.length).to.equal(0);
  });

  it(`Ensure PNC referral Follow up task is  triggered if response is no `, async () => {
    const result = await harness.fillForm(pnc_referral_followup, ...pnc_referral_form.healthcheckupno);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 4 });
    const task = await harness.getTasks({ title: PNC_REFERRAL_FOLLOWUP_TASK_TITLE });
    expect(task.length).to.equal(1);
  });

  it(`Ensure PNC service Follow up task is not triggered if response is yes `, async () => {
    const pncServiceResult = await harness.fillForm(pnc_referral_followup, ...pnc_referral_form.healthcheckupyes);
    expect(pncServiceResult.errors).to.be.empty;

    const pncFollowUpTasksAfter = await harness.getTasks({ title: PNC_REFERRAL_FOLLOWUP_TASK_TITLE });
    expect(pncFollowUpTasksAfter.length).to.equal(0);
  });
  
  it('Ensure PNC referral Follow up task is completed', async () => {
    let result = await harness.fillForm(pnc_referral_followup, ...pnc_referral_form.healthcheckupno);
    expect(result.errors).to.be.empty;

    await harness.flush({ days: 4 });

    let task = await harness.getTasks({ title: PNC_REFERRAL_FOLLOWUP_TASK_TITLE });
    expect(task.length).to.equal(1);

    result = await harness.loadAction(task[0], pnc_referral_followup, ...pnc_referral_form.healthcheckupyes);
    expect(result.errors).to.be.empty;

    task = await harness.getTasks({ title: PNC_REFERRAL_FOLLOWUP_TASK_TITLE });
    expect(task.length).to.equal(0);
  });
});
