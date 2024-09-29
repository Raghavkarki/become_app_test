const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const {
  today,
  pregnancySurveillance: {
    iucd_used: ps_iucd_used,
    implant_symptoms: ps_implant_symptoms,
    depo_conditions: ps_depo_conditions,
    pills_conditions: ps_pills_conditions,
    balanced_counseling: ps_balanced_counseling
  },
  familyPlanning: {
    iucd_used: fp_iucd_used,
    implant_symptoms: fp_implant_symptoms,
    depo_conditions: fp_depo_conditions,
    pills_conditions: fp_pills_conditions,
    balanced_counseling: fp_balanced_counseling
  }
} = require('../form-inputs');
const harness = new TestRunner();

const PREGNANCY_SURVEILLANCE_FORM = 'pregnancy_surveillance_form';

const IUCD_IMPLANT_COMPLICATION_FOLLOWUP_IUCD_USED_TASK_TITLE =
  'task.iucd_and_implant.complication_sign_followup.iucd';
const IUCD_IMPLANT_COMPLICATION_FOLLOWUP_IMPLANT_SYMPTOMS_TASK_TITLE =
  'task.iucd_and_implant.complication_sign_followup.implant';
const IUCD_IMPLANT_REFERRAL_FOLLOWUP_DEPO_CONDITIONS_TASK_TITLE =
  'task.referral_followup_pills_depo.depo';
const IUCD_IMPLANT_REFERRAL_FOLLOWUP_PILLS_CONDITIONS_TASK_TITLE =
  'task.referral_followup_pills_depo.pills';
const BALANCED_COUNSELING_FAMILY_PLANNING_TASK_TITLE =
  'task.balanced_counseling.family_planning_followup';

describe('Family planning task generation tests', () => {
  before(async () => await harness.start());
  after(async () => await harness.stop());

  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(today);
  });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('Checking followup task on iucd danger signs', async () => {
    let result = await harness.fillForm(PREGNANCY_SURVEILLANCE_FORM, ...ps_iucd_used);
    expect(result.errors).to.be.empty;

    // Ensure task does not appear immediately
    expect(
      await harness.getTasks({ 
        title: IUCD_IMPLANT_COMPLICATION_FOLLOWUP_IUCD_USED_TASK_TITLE 
      })
    ).to.have.property('length', 0);

    // After 10 days the task appears
    await harness.flush({ days: 10 });
    const tasks = await harness.getTasks({ title: IUCD_IMPLANT_COMPLICATION_FOLLOWUP_IUCD_USED_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    // Ensure task is resolved
    result = await harness.loadAction(tasks[0], ...fp_iucd_used);
    expect(result.errors).to.be.empty;
    expect(
      await harness.getTasks({ 
        title: IUCD_IMPLANT_COMPLICATION_FOLLOWUP_IUCD_USED_TASK_TITLE 
      })
    ).to.have.property('length', 0);
  });

  it('Checking followup task on implant danger signs', async () => {
    let result = await harness.fillForm(PREGNANCY_SURVEILLANCE_FORM, ...ps_implant_symptoms);
    expect(result.errors).to.be.empty;

    // Ensure task does not appear immediately
    expect(
      await harness.getTasks({ 
        title: IUCD_IMPLANT_COMPLICATION_FOLLOWUP_IMPLANT_SYMPTOMS_TASK_TITLE
      })
    ).to.have.property('length', 0);

    await harness.flush({ days: 7 });
    const tasks = await harness.getTasks({ title: IUCD_IMPLANT_COMPLICATION_FOLLOWUP_IMPLANT_SYMPTOMS_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    // Ensure the task is resolved
    result = await harness.loadAction(tasks[0], ...fp_implant_symptoms);
    expect(result.errors).to.be.empty;
    expect(
      await harness.getTasks({ 
        title: IUCD_IMPLANT_COMPLICATION_FOLLOWUP_IMPLANT_SYMPTOMS_TASK_TITLE
      })
    ).to.have.property('length', 0);
  });

  it('Checking followup task on depo danger signs', async () => {
    let result = await harness.fillForm(PREGNANCY_SURVEILLANCE_FORM, ...ps_depo_conditions);
    expect(result.errors).to.be.empty;

    // Ensure task does not appear immediately
    expect(
      await harness.getTasks({ 
        title: IUCD_IMPLANT_REFERRAL_FOLLOWUP_DEPO_CONDITIONS_TASK_TITLE
      })
    ).to.have.property('length', 0);

    await harness.flush({ days: 7 });
    const tasks = await harness.getTasks({ title: IUCD_IMPLANT_REFERRAL_FOLLOWUP_DEPO_CONDITIONS_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    // Ensure the task is resolved
    result = await harness.loadAction(tasks[0], ...fp_depo_conditions);
    expect(result.errors).to.be.empty;
    expect(
      await harness.getTasks({ 
        title: IUCD_IMPLANT_REFERRAL_FOLLOWUP_DEPO_CONDITIONS_TASK_TITLE
      })
    ).to.have.property('length', 0);
  });

  it('Checking followup task on pills danger signs', async () => {
    let result = await harness.fillForm(PREGNANCY_SURVEILLANCE_FORM, ...ps_pills_conditions);
    expect(result.errors).to.be.empty;

    // Ensure task does not appear immediately
    expect(
      await harness.getTasks({ 
        title: IUCD_IMPLANT_REFERRAL_FOLLOWUP_PILLS_CONDITIONS_TASK_TITLE
      })
    ).to.have.property('length', 0);

    await harness.flush({ days: 35 });
    const tasks = await harness.getTasks({ title: IUCD_IMPLANT_REFERRAL_FOLLOWUP_PILLS_CONDITIONS_TASK_TITLE });
    expect(tasks.length).to.equal(1);

    // Ensure the task is resolved
    result = await harness.loadAction(tasks[0], ...fp_pills_conditions);
    expect(result.errors).to.be.empty;
    expect(
      await harness.getTasks({ 
        title: IUCD_IMPLANT_REFERRAL_FOLLOWUP_PILLS_CONDITIONS_TASK_TITLE
      })
    ).to.have.property('length', 0);
  });

  it('Checking followup task on family planning from balanced counseling', async () => {
    let result = await harness.fillForm(PREGNANCY_SURVEILLANCE_FORM, ...ps_balanced_counseling);
    expect(result.errors).to.be.empty;

    // Ensure task does not appear immediately
    expect(
      await harness.getTasks({ 
        title: BALANCED_COUNSELING_FAMILY_PLANNING_TASK_TITLE
      })
    ).to.have.property('length', 0);

    await harness.flush({ days: 45 });
    const tasks = await harness.getTasks({ title: BALANCED_COUNSELING_FAMILY_PLANNING_TASK_TITLE});
    expect(tasks.length).to.equal(1);

    // Ensure the task is resolved
    result = await harness.loadAction(tasks[0], ...fp_balanced_counseling);
    expect(result.errors).to.be.empty;
    expect(
      await harness.getTasks({ 
        title: BALANCED_COUNSELING_FAMILY_PLANNING_TASK_TITLE
      })
    ).to.have.property('length', 0);
  });
});
