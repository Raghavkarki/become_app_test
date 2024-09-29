const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const harness = new TestRunner();
const { pncDangerSignMother, pncDangerSignBaby, today} = require('../form-inputs');
const PNC_DANGER_SIGN_TASK_TITLE_MOTHER = 'task.pnc.danger_sign_followup_mother.title';
const PNC_DANGER_SIGN_FORM_MOTHER =  'pnc_danger_sign_follow_up_mother';
const PNC_DANGER_SIGN_BABY = 'pnc_danger_sign_follow_up_baby';


describe('pnc danger sign task tests', () => {
  before(async () => { return await harness.start(); });
  after(async () => { return await harness.stop(); });

  beforeEach(
    async () => {
      await harness.clear();
      await harness.setNow(today);
      harness.subject.t_danger_signs_referral_follow_up = 'yes';
    });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it(`ensure pnc danger sign task for mother is generated`, async () => {
    let result = await harness.fillForm(PNC_DANGER_SIGN_BABY, ...pncDangerSignBaby.oneDangerSign);
    expect(result.errors).to.be.empty;

    result = await harness.fillForm(PNC_DANGER_SIGN_FORM_MOTHER, ...pncDangerSignMother.oneDangerSign);
    expect(result.errors).to.be.empty;

    const tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE_MOTHER});
    expect(tasks.length).to.equal(1);
  });

  it(`ensure pnc danger sign task is not generated when there is no danger sign`, async () => {
    let result = await harness.fillForm(PNC_DANGER_SIGN_BABY, ...pncDangerSignBaby.oneDangerSign);
    expect(result.errors).to.be.empty;

    result = await harness.fillForm(PNC_DANGER_SIGN_FORM_MOTHER, ...pncDangerSignMother.noDangerSign);
    expect(result.errors).to.be.empty;

    const tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE_MOTHER});
    expect(tasks.length).to.equal(0);
  });
});
