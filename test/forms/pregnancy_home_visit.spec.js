const { expect } = require('chai');
const TestRunner = require('cht-conf-test-harness');
const { today, pregnancyHomeVisit } = require('../form-inputs');
const harness = new TestRunner();
const PREGNANCY_HOME_VISIT_FORM = 'pregnancy_home_visit';

describe(`${PREGNANCY_HOME_VISIT_FORM} form tests.`, () => {
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


  ['migrated', 'refused'].forEach(reason => {
    ['clear_this', 'clear_all'].forEach(nextStep => {
      it(`Fill ${PREGNANCY_HOME_VISIT_FORM} form for ${reason} and ${nextStep}.`, async () => {
        const result = await harness.fillForm(PREGNANCY_HOME_VISIT_FORM, ...pregnancyHomeVisit.noService(reason, nextStep));
        expect(result.errors).to.be.empty;
      });
    });
  });
});
