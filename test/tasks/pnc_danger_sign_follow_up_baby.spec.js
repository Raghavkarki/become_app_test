const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { pncDangerSignBaby, under_5_child, today} = require('../form-inputs');
const harness = new TestRunner();
const PNC_DANGER_SIGN_TASK_TITLE = 'task.pnc.danger_sign_followup_baby.title';
const UNDER_5_CHILD_FORM = 'under_5_child';
const PNC_DANGER_SIGN_FORM =  'pnc_danger_sign_follow_up_baby';


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

  it(`ensure pnc danger sign task is generated`, async () => {
    const result = await harness.fillForm(PNC_DANGER_SIGN_FORM, ...pncDangerSignBaby.oneDangerSign);
    expect(result.errors).to.be.empty;

    const tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(1);
  });

  it(`ensure pnc danger sign task is generated as long as there are danger signs`, async () => {
    let result = await harness.fillForm(PNC_DANGER_SIGN_FORM, ...pncDangerSignBaby.oneDangerSign);
    expect(result.errors).to.be.empty;

    let tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(1);

    // complete task again, ensure there are some danger signs
    result = await harness.loadAction(tasks[0],...pncDangerSignBaby.manyDangerSign);
    expect(result.errors).to.be.empty;

    tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(1);

  });

  it(`ensure pnc danger sign task is not generated when there are no danger signs.`, async () => {
    let result = await harness.fillForm(PNC_DANGER_SIGN_FORM, ...pncDangerSignBaby.oneDangerSign);
    expect(result.errors).to.be.empty;

    let tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(1);

    // complete task again, ensure there are some danger signs
    result = await harness.loadAction(tasks[0],...pncDangerSignBaby.manyDangerSign);
    expect(result.errors).to.be.empty;
    
    await harness.flush({minutes:10});
    tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(1);

    // complete task again, ensure there are no danger signs
    result = await harness.loadAction(tasks[0],...pncDangerSignBaby.noDangerSign);
    expect(result.errors).to.be.empty;

    await harness.flush({minutes:10});
    tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(0);

  });

  // https://github.com/medic/config-nssd/issues/403
  it(`ensure filling other forms before task doesn't fail tasks.`, async () => {
    let result = await harness.fillForm(PNC_DANGER_SIGN_FORM, ...pncDangerSignBaby.oneDangerSign);
    expect(result.errors).to.be.empty;

    let tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(1);

    // complete task again, ensure there are some danger signs
    result = await harness.loadAction(tasks[0],...pncDangerSignBaby.manyDangerSign);
    expect(result.errors).to.be.empty;

    // Fill some other form before pulling tasks
    result = await harness.fillForm(UNDER_5_CHILD_FORM,...under_5_child.no_vaccine_card);
    expect(result.errors).to.be.empty;
    
    await harness.flush({minutes:10});
    tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(1);

    // complete task again, ensure there are no danger signs
    result = await harness.loadAction(tasks[0],...pncDangerSignBaby.noDangerSign);
    expect(result.errors).to.be.empty;

    await harness.flush({minutes:10});
    tasks = await harness.getTasks({title:PNC_DANGER_SIGN_TASK_TITLE});
    expect(tasks.length).to.equal(0);

  });

});
