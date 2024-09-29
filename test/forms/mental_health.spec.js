const { expect } = require('chai');
const Harness = require('cht-conf-test-harness');
const {
  today,
  mentalHealth: {
    screening,
    examined,
    notExamined,
    diagnosedOther
  }
} = require('../form-inputs');
const harness = new Harness();

const MENTAL_HEALTH_FORM = 'mental_health_screening';
const MENTAL_HEALTH_FOLLOWUP_FORM = 'mental_health_referral_follow_up';

describe('Mental health screening and followup form tests', () => {
  before(async () => await harness.start());
  after(async () => await harness.stop());

  beforeEach(async () => {
    await harness.clear();
    await harness.setNow(today);
  });

  afterEach(() => {
    expect(harness.consoleErrors).to.be.empty;
  });

  it('Testing form submission with multiple choices for mental health screening', async () => {
    const result = await harness.fillForm(MENTAL_HEALTH_FORM, ...screening);
    expect(result.errors).to.be.empty;
  });

  it('Testing patient did not visit and open text field on followup form', async () => {
    const result = await harness.fillForm(MENTAL_HEALTH_FOLLOWUP_FORM, ...notExamined);
    expect(result.errors).to.be.empty;
  });

  it('Testing patient examined fields on followup', async () => {
    const result = await harness.fillForm(MENTAL_HEALTH_FOLLOWUP_FORM, ...examined);
    expect(result.errors).to.be.empty;
  });

  it('Testing other reasons open text field on other diagnosis', async () => {
    const result = await harness.fillForm(MENTAL_HEALTH_FOLLOWUP_FORM, ...diagnosedOther);
    expect(result.errors).to.be.empty;
  });
});
